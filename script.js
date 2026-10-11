// Lively Wallpaper
// JDX-wallpaper by Fleen5177

const DEFAULT_CONFIG = Object.freeze({
    density: 300,
    size: 4.5,
    opacity: 45,
    speed: 2.4,
    wind: 2.6,
    parallax: 0, // 0 = disabled; 1..100 maps to 1.5x..4x
    mist: true,
    glow: true,
    wallpaperId: "ChaserJZX100_2"
});

const WALLPAPERS = [
    {
        id: "ChaserJZX100_1",
        name: "Chaser JZX100 (1)",
        image: "wallpaper/ChaserJZX100_1.jpg",
        thumbnail: "wallpaper/ChaserJZX100_1.jpg"
    },
    {
        id: "ChaserJZX100_2",
        name: "Chaser JZX100 (2)",
        image: "wallpaper/ChaserJZX100_2.jpg",
        thumbnail: "wallpaper/ChaserJZX100_2.jpg"
    },
    {
        id: "ChaserJZX100_3",
        name: "Chaser JZX100 (3)",
        image: "wallpaper/ChaserJZX100_3.jpg",
        thumbnail: "wallpaper/ChaserJZX100_3.jpg"
    },
        {
        id: "Laurelc35",
        name: "Laurel c35",
        image: "wallpaper/Laurelc35.jpg",
        thumbnail: "wallpaper/Laurelc35.jpg"
    },
    {
        id: "mark2",
        name: "Mark II",
        image: "wallpaper/mark2.jpg",
        thumbnail: "wallpaper/mark2.jpg"
    },
    {
        id: "vaz2107",
        name: "ВАЗ 2107",
        image: "wallpaper/vaz2107.jpg",
        thumbnail: "wallpaper/vaz2107.jpg"
    }
];

(() => {
    "use strict";

    const canvas = document.getElementById("snow");
    const context = canvas.getContext("2d", { alpha: true });
    const imageWrap = document.querySelector(".image-wrap");
    const background = document.getElementById("background");
    const settingsPanel = document.getElementById("settings");
    const galleryGrid = document.getElementById("gallery-grid");
    const $ = (id) => document.getElementById(id);

    let config = { ...DEFAULT_CONFIG };
    let width = 0;
    let height = 0;
    let pixelRatio = 1;
    let flakes = [];
    let previousFrame = performance.now();

    const pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };

    const sliderFormatters = {
        density: (value) => `${Math.round(value)} частиц`,
        size: (value) => `${Number(value).toFixed(1)} px`,
        opacity: (value) => `${Math.round(value)}%`,
        speed: (value) => `${Number(value).toFixed(1)}×`,
        wind: (value) => Number(value).toFixed(1),
        parallax: (value) => value === 0
            ? "Выкл."
            : `${(1.5 + ((value - 1) / 99) * 2.5).toFixed(1)}×`
    };

    function loadConfig() {
        try {
            const saved = JSON.parse(localStorage.getItem("winterNightSettings") || "{}");
            config = { ...DEFAULT_CONFIG, ...saved };
        } catch {
            config = { ...DEFAULT_CONFIG };
        }

        config.parallax = Math.max(0, Math.min(100, Number(config.parallax) || 0));
        if (!WALLPAPERS.some((item) => item.id === config.wallpaperId)) {
            config.wallpaperId = WALLPAPERS[0].id;
        }
    }

    function saveConfig() {
        try {
            localStorage.setItem("winterNightSettings", JSON.stringify(config));
        } catch {
        }
    }

    function currentWallpaper() {
        return WALLPAPERS.find((item) => item.id === config.wallpaperId) || WALLPAPERS[0];
    }

    function renderGallery() {
        galleryGrid.replaceChildren();
        $("gallery-count").textContent = `${WALLPAPERS.length} ${WALLPAPERS.length === 1 ? "обои" : "варианта"}`;

        for (const wallpaper of WALLPAPERS) {
            const card = document.createElement("button");
            const image = document.createElement("img");
            const info = document.createElement("span");
            const name = document.createElement("span");
            const checkmark = document.createElement("span");
            const selected = wallpaper.id === config.wallpaperId;

            card.type = "button";
            card.className = `wallpaper-card${selected ? " selected" : ""}`;
            card.setAttribute("aria-pressed", String(selected));
            card.setAttribute("aria-label", `Выбрать обои: ${wallpaper.name}`);

            image.src = wallpaper.thumbnail || wallpaper.image;
            image.alt = "";
            image.loading = "lazy";

            info.className = "card-info";
            name.className = "card-name";
            name.textContent = wallpaper.name;
            checkmark.className = "checkmark";
            checkmark.textContent = "✓";
            checkmark.setAttribute("aria-hidden", "true");

            info.append(name, checkmark);
            card.append(image, info);
            card.addEventListener("click", () => selectWallpaper(wallpaper.id));
            galleryGrid.append(card);
        }
    }

    function selectWallpaper(wallpaperId) {
        const wallpaper = WALLPAPERS.find((item) => item.id === wallpaperId);
        if (!wallpaper) return;

        config.wallpaperId = wallpaperId;
        background.src = wallpaper.image;
        renderGallery();
        saveConfig();
    }

    function syncSettingsUI() {
        for (const key of ["density", "size", "opacity", "speed", "wind", "parallax"]) {
            const slider = $(key);
            const min = Number(slider.min);
            const max = Number(slider.max);
            const value = Number(config[key]);
            const fill = ((value - min) / (max - min)) * 100;

            slider.value = value;
            slider.style.setProperty("--fill", `${fill}%`);
            $(`${key}-value`).textContent = sliderFormatters[key](value);
        }

        $("mist").checked = config.mist;
        $("glow").checked = config.glow;
        document.body.classList.toggle("no-mist", !config.mist);
        document.body.classList.toggle("no-glow", !config.glow);
    }

    function resizeCanvas() {
        pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = Math.round(width * pixelRatio);
        canvas.height = Math.round(height * pixelRatio);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        rebuildSnow();
    }

    function randomBetween(min, max) {
        return min + Math.random() * (max - min);
    }

    function createFlake(initial = false) {
        const depth = Math.random();
        return {
            x: randomBetween(-width * 0.1, width * 1.1),
            y: initial ? randomBetween(0, height) : randomBetween(-Math.max(8, height * 0.08), -4),
            depth,
            radius: config.size * (0.22 + depth * 0.78) * randomBetween(0.72, 1.2),
            fallSpeed: config.speed * (0.45 + depth * 1.25),
            phase: randomBetween(0, Math.PI * 2),
            drift: randomBetween(-0.35, 0.35),
            alpha: (config.opacity / 100) * (0.22 + depth * 0.48),
            stretch: 0.8 + depth * 2.4,
            windFactor: 0.35 + depth * 0.9
        };
    }

    function rebuildSnow() {
        flakes = Array.from(
            { length: Math.min(900, Math.round(config.density)) },
            () => createFlake(true)
        );
    }

    function drawSnow(delta) {
        context.clearRect(0, 0, width, height);

        for (const flake of flakes) {
            flake.phase += 0.018 * delta;
            flake.y += flake.fallSpeed * delta;
            flake.x -= config.wind * flake.windFactor * delta;
            flake.x += (Math.sin(flake.phase) * (0.35 + flake.depth * 0.7) + flake.drift) * delta;

            if (flake.y > height + 18) {
                flake.y = -randomBetween(4, Math.max(8, height * 0.08));
                flake.x = randomBetween(-width * 0.05, width * 1.05);
            }
            if (flake.x < -18) {
                flake.x = width + randomBetween(0, 24);
            } else if (flake.x > width + 18) {
                flake.x = -randomBetween(0, 24);
            }

            context.save();
            context.globalAlpha = Math.min(0.95, flake.alpha);
            context.fillStyle = "#e8f7ff";
            context.shadowBlur = flake.radius > config.size * 0.65 ? 5 : 0;
            context.shadowColor = "rgba(205, 235, 255, 0.45)";
            context.translate(flake.x, flake.y);
            context.rotate(-0.24);
            context.beginPath();
            context.ellipse(0, 0, Math.max(0.6, flake.radius * 0.42), Math.max(0.8, flake.radius * flake.stretch * 0.62), 0, 0, Math.PI * 2);
            context.fill();
            context.restore();
        }
    }

    function parallaxMultiplier() {
        if (config.parallax === 0) return 0;
        return 1.5 + ((config.parallax - 1) / 99) * 2.5;
    }

    function updateParallax() {
        pointer.x += (pointer.targetX - pointer.x) * 0.025;
        pointer.y += (pointer.targetY - pointer.y) * 0.025;
        const multiplier = parallaxMultiplier();

        imageWrap.style.transform = multiplier === 0
            ? "translate3d(0, 0, 0) scale(1.035)"
            : `translate3d(${pointer.x * -10 * multiplier}px, ${pointer.y * -7 * multiplier}px, 0) scale(1.035)`;
    }

    function setActiveTab(tabName) {
        document.querySelectorAll(".tab").forEach((tab) => {
            const active = tab.dataset.tab === tabName;
            tab.classList.toggle("active", active);
            tab.setAttribute("aria-selected", String(active));
        });
        $("gallery-view").hidden = tabName !== "gallery";
        $("settings-view").hidden = tabName !== "settings";
    }

    function applyAvailableAccent() {
        const accent = getComputedStyle(document.documentElement)
            .getPropertyValue("--user-accent-color")
            .trim();
        if (accent) document.documentElement.style.setProperty("--accent", accent);
    }

    function bindControls() {
        for (const key of ["density", "size", "opacity", "speed", "wind", "parallax"]) {
            $(key).addEventListener("input", () => {
                config[key] = Number($(key).value);
                syncSettingsUI();
                if (["density", "size", "opacity", "speed"].includes(key)) rebuildSnow();
                saveConfig();
            });
        }

        $("mist").addEventListener("change", () => {
            config.mist = $("mist").checked;
            syncSettingsUI();
            saveConfig();
        });
        $("glow").addEventListener("change", () => {
            config.glow = $("glow").checked;
            syncSettingsUI();
            saveConfig();
        });
        $("settings-toggle").addEventListener("click", () => settingsPanel.classList.toggle("open"));
        $("close-settings").addEventListener("click", () => settingsPanel.classList.remove("open"));
        document.querySelectorAll(".tab").forEach((tab) => {
            tab.addEventListener("click", () => setActiveTab(tab.dataset.tab));
        });
        $("reset").addEventListener("click", () => {
            config = { ...DEFAULT_CONFIG };
            syncSettingsUI();
            selectWallpaper(config.wallpaperId);
            rebuildSnow();
            saveConfig();
        });

        window.addEventListener("resize", resizeCanvas);
        window.addEventListener("pointermove", (event) => {
            pointer.targetX = event.clientX / Math.max(1, width) - 0.5;
            pointer.targetY = event.clientY / Math.max(1, height) - 0.5;
        }, { passive: true });
    }

    function animate(now) {
        const delta = Math.min(2, (now - previousFrame) / 16.67 || 1);
        previousFrame = now;
        drawSnow(delta);
        updateParallax();
        requestAnimationFrame(animate);
    }

    function initialize() {
        loadConfig();
        background.src = currentWallpaper().image;
        renderGallery();
        syncSettingsUI();
        applyAvailableAccent();
        bindControls();
        resizeCanvas();
        requestAnimationFrame(animate);
    }

    initialize();
})();
