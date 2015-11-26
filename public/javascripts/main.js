define([
    "THREE",
    "RandomEngine",
    "IOHandler",
    "Sprite",
    "Dungeon",
    "SocketIO",
    "AssetManager"
], function(
    THREE,
    RandomEngine,
    IOHandler,
    Sprite,
    Dungeon,
    SocketIO,
    AssetManager
) {

    var iohandler = new IOHandler();
    var socket = new SocketIO();

    var dungeon = null;
    var scene = new THREE.Scene();
    var clock = new THREE.Clock();

    var camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 11;
    camera.position.y = 0;

    var renderer = new THREE.WebGLRenderer();
    var bgColor = 0x332222;
    renderer.setClearColor(bgColor);
    document.body.appendChild(renderer.domElement);

    var map;
    var character;
    var characters = {};
    window.characters = characters;

    window.paused = false;
    var debug = document.getElementById("debug");

    var LERP_FRACTION = 1.0 / 6.0; /* 0 < LERP_FRACTION <= 1.0 */

    window.addEventListener('resize', resizeHandler, false);

    socket.on("body-create", function(body) {
        console.info("client connected");
    });

    socket.on("body-destroy", function(body) {
        console.info("client disconnected", body, characters);
        dungeon.remove(characters[body.id]);
        delete characters[body.id];
    });

    socket.on("bodies", function(bodies) {
        if (dungeon) {
            var b = 0;
            var coords = [];
            for (i in bodies) {
                var body = bodies[i];
                var ch = characters[body.id];
                if (!ch) {
                    var ch = createCharacter();
                    characters[body.id] = ch;
                    dungeon.add(ch);
                }
                ch.position.set(body.x + 0.5, -body.y + 0.5, 0);
                ch.quaternion.setFromAxisAngle(new THREE.Vector3(0, 0, 1), body.angle);

                coords.push('( ' + (Math.floor(10 * body.x) / 10) + ' , ' + (Math.floor(10 * body.y) / 10) + ' )');
            }
            debug.innerHTML = coords.join(' ');
        }
    });

    socket.on("map-update", load);
    AssetManager.onLoad(init);

    resizeHandler();

    ///////////////////////////

    function createCharacter() {
        // add character
        var img = AssetManager.images.sprite_map;
        ch = new Sprite(img, img.width, img.height, 16, 16);
        ch.setTile(16 * 12 + 1);
        ch.setSize(1, 1);
        return ch;
    }

    function resizeHandler(event) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    };

    function load() {
        if (!AssetManager.loaded()) {
            return;
        }

        while (scene.children.length > 0)
            scene.remove(scene.children[0]);

        map = iohandler.getMap();

        dungeon = new Dungeon(map);
        dungeon.position.set(-map[0].length / 2, map.length / 2 - 1, 0);
        scene.add(dungeon);

        for (var i in characters)
            dungeon.add(characters[i]);

        // TODO: the light shader is broken, don't add more lights!
        var light = new THREE.PointLight(0xFFF6BB, 1.0, 7.0);
        light.position.set(map[0].length / 2 + 0.5, -map.length / 2 + 1, 0);
        dungeon.add(light);
    }

    function init() {
        if (iohandler.getMap()) {
            load();
        }

        loop();
    }

    var ang = 0;

    /**
     * Main render loop
     */
    function loop() {
        if (window.paused) {
            return window.requestAnimationFrame(loop);
        }

        var deltaTime = clock.getDelta();

        ang += deltaTime * Math.PI * 1 / 2;

        renderer.render(scene, camera);

        return window.requestAnimationFrame(loop);
    }

});