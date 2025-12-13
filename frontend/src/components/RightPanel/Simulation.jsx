import { useEffect, useRef, useState } from "react";

/**
 * MVP Trafik Simülasyonu
 * 
 * - 4 yönlü kavşak
 * - Her yolda araç ışığı
 * - Her yaya geçidinin iki tarafında yaya ışığı
 * - Yayalar sadece yaya ışığı yeşilken geçer
 * - Araçlar sadece araç ışığı yeşilken geçer
 */

export function Simulation() {
    const canvasRef = useRef(null);
    const animationRef = useRef(null);
    const lastTimeRef = useRef(performance.now());

    const fileInputRef = useRef(null);
    const [selectedLight, setSelectedLight] = useState(null);
    const [videos, setVideos] = useState({});

    // Sabitler
    const W = 800, H = 600;
    const CX = W / 2, CY = H / 2;
    const ROAD_W = 70; // Yol genişliği (tek yön)
    const GREEN_TIME = 10, YELLOW_TIME = 2;

    // Simülasyon state
    const simRef = useRef({
        // Faz: 0=NS araç yeşil (EW yaya yeşil), 1=NS sarı, 2=EW araç yeşil (NS yaya yeşil), 3=EW sarı
        phase: 0,
        timer: GREEN_TIME,

        cars: [],
        pedestrians: [],
        carSpawnTimer: 0,
        pedSpawnTimer: 0,
    });

    // Araç ışığı rengi
    const getCarLight = (direction) => {
        const phase = simRef.current.phase;
        // NS = Kuzey-Güney, EW = Doğu-Batı
        if (direction === "NS") {
            if (phase === 0) return "green";
            if (phase === 1) return "yellow";
            return "red";
        } else {
            if (phase === 2) return "green";
            if (phase === 3) return "yellow";
            return "red";
        }
    };

    // Yaya ışığı rengi (araç ışığının tersi)
    const getPedLight = (crossingDirection) => {
        // Yaya yatay geçecekse (EW), NS araçları durmalı
        // Yaya dikey geçecekse (NS), EW araçları durmalı
        const phase = simRef.current.phase;
        if (crossingDirection === "horizontal") {
            // Yatay geçiş = NS araçlar durmalı = NS kırmızı = phase 2 veya 3
            return (phase === 2 || phase === 3) ? "green" : "red";
        } else {
            // Dikey geçiş = EW araçlar durmalı = EW kırmızı = phase 0 veya 1
            return (phase === 0 || phase === 1) ? "green" : "red";
        }
    };

    // Güncelleme
    const update = (dt) => {
        const sim = simRef.current;

        // Işık zamanlayıcı
        sim.timer -= dt;
        if (sim.timer <= 0) {
            sim.phase = (sim.phase + 1) % 4;
            sim.timer = (sim.phase % 2 === 0) ? GREEN_TIME : YELLOW_TIME;
        }

        // Araç spawn
        sim.carSpawnTimer -= dt;
        if (sim.carSpawnTimer <= 0) {
            sim.carSpawnTimer = 2.5;
            spawnCar(sim);
        }

        // Yaya spawn
        sim.pedSpawnTimer -= dt;
        if (sim.pedSpawnTimer <= 0) {
            sim.pedSpawnTimer = 4;
            spawnPedestrian(sim);
        }

        updateCars(sim, dt);
        updatePedestrians(sim, dt);
    };

    // Araç oluştur
    const spawnCar = (sim) => {
        const dirs = ["north", "south", "east", "west"];
        const dir = dirs[Math.floor(Math.random() * dirs.length)];

        let x, y;
        switch (dir) {
            case "north": x = CX + ROAD_W / 2; y = H + 40; break; // Aşağıdan yukarı
            case "south": x = CX - ROAD_W / 2; y = -40; break; // Yukarıdan aşağı
            case "east": x = -40; y = CY + ROAD_W / 2; break; // Soldan sağa
            case "west": x = W + 40; y = CY - ROAD_W / 2; break; // Sağdan sola
        }

        sim.cars.push({ x, y, dir, speed: 100 });
    };

    // Araçları güncelle
    const updateCars = (sim, dt) => {
        const newCars = [];

        for (const car of sim.cars) {
            let dx = 0, dy = 0;
            let lightDir, stopLine;

            switch (car.dir) {
                case "north":
                    dy = -1;
                    lightDir = "NS";
                    stopLine = CY + ROAD_W + 30;
                    break;
                case "south":
                    dy = 1;
                    lightDir = "NS";
                    stopLine = CY - ROAD_W - 30;
                    break;
                case "east":
                    dx = 1;
                    lightDir = "EW";
                    stopLine = CX - ROAD_W - 30;
                    break;
                case "west":
                    dx = -1;
                    lightDir = "EW";
                    stopLine = CX + ROAD_W + 30;
                    break;
            }

            const light = getCarLight(lightDir);
            let shouldStop = false;

            // Dur çizgisine yaklaşırken kırmızı/sarı ise dur
            if (light !== "green") {
                const margin = 50;
                if (car.dir === "north" && car.y > stopLine && car.y < stopLine + margin) shouldStop = true;
                if (car.dir === "south" && car.y < stopLine && car.y > stopLine - margin) shouldStop = true;
                if (car.dir === "east" && car.x < stopLine && car.x > stopLine - margin) shouldStop = true;
                if (car.dir === "west" && car.x > stopLine && car.x < stopLine + margin) shouldStop = true;
            }

            if (!shouldStop) {
                car.x += dx * car.speed * dt;
                car.y += dy * car.speed * dt;
            }

            // Ekranda mı?
            if (car.x > -60 && car.x < W + 60 && car.y > -60 && car.y < H + 60) {
                newCars.push(car);
            }
        }

        sim.cars = newCars;
    };

    // Yaya oluştur
    const spawnPedestrian = (sim) => {
        // 4 yaya geçidi var: üst, alt, sol, sağ
        const crossings = [
            // Üst yatay geçit (soldan sağa)
            { x: CX - ROAD_W - 30, y: CY - ROAD_W - 20, tx: CX + ROAD_W + 30, ty: CY - ROAD_W - 20, cross: "horizontal" },
            // Üst yatay geçit (sağdan sola)
            { x: CX + ROAD_W + 30, y: CY - ROAD_W - 20, tx: CX - ROAD_W - 30, ty: CY - ROAD_W - 20, cross: "horizontal" },
            // Alt yatay geçit (soldan sağa)
            { x: CX - ROAD_W - 30, y: CY + ROAD_W + 20, tx: CX + ROAD_W + 30, ty: CY + ROAD_W + 20, cross: "horizontal" },
            // Alt yatay geçit (sağdan sola)
            { x: CX + ROAD_W + 30, y: CY + ROAD_W + 20, tx: CX - ROAD_W - 30, ty: CY + ROAD_W + 20, cross: "horizontal" },
            // Sol dikey geçit (yukarıdan aşağı)
            { x: CX - ROAD_W - 20, y: CY - ROAD_W - 30, tx: CX - ROAD_W - 20, ty: CY + ROAD_W + 30, cross: "vertical" },
            // Sol dikey geçit (aşağıdan yukarı)
            { x: CX - ROAD_W - 20, y: CY + ROAD_W + 30, tx: CX - ROAD_W - 20, ty: CY - ROAD_W - 30, cross: "vertical" },
            // Sağ dikey geçit (yukarıdan aşağı)
            { x: CX + ROAD_W + 20, y: CY - ROAD_W - 30, tx: CX + ROAD_W + 20, ty: CY + ROAD_W + 30, cross: "vertical" },
            // Sağ dikey geçit (aşağıdan yukarı)
            { x: CX + ROAD_W + 20, y: CY + ROAD_W + 30, tx: CX + ROAD_W + 20, ty: CY - ROAD_W - 30, cross: "vertical" },
        ];

        const c = crossings[Math.floor(Math.random() * crossings.length)];
        sim.pedestrians.push({
            x: c.x,
            y: c.y,
            targetX: c.tx,
            targetY: c.ty,
            crossDir: c.cross,
            state: "waiting", // waiting, crossing, done
        });
    };

    // Yayaları güncelle
    const updatePedestrians = (sim, dt) => {
        const newPeds = [];

        for (const ped of sim.pedestrians) {
            const pedLightColor = getPedLight(ped.crossDir);

            if (ped.state === "waiting") {
                // Yaya ışığı yeşil mi?
                if (pedLightColor === "green") {
                    ped.state = "crossing";
                }
                newPeds.push(ped);
            } else if (ped.state === "crossing") {
                const dx = ped.targetX - ped.x;
                const dy = ped.targetY - ped.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist > 5) {
                    const speed = 50;
                    ped.x += (dx / dist) * speed * dt;
                    ped.y += (dy / dist) * speed * dt;
                    newPeds.push(ped);
                }
                // Hedefe ulaştı = sil
            }
        }

        sim.pedestrians = newPeds;
    };

    // Çizim
    const render = (ctx) => {
        const sim = simRef.current;

        // Arkaplan (çim)
        ctx.fillStyle = "#228B22";
        ctx.fillRect(0, 0, W, H);

        // Yollar
        ctx.fillStyle = "#333";
        // Dikey yol
        ctx.fillRect(CX - ROAD_W, 0, ROAD_W * 2, H);
        // Yatay yol
        ctx.fillRect(0, CY - ROAD_W, W, ROAD_W * 2);

        // Yol ortası çizgisi (sarı kesikli)
        ctx.strokeStyle = "#FFD700";
        ctx.lineWidth = 3;
        ctx.setLineDash([15, 10]);

        // Dikey orta çizgi
        ctx.beginPath();
        ctx.moveTo(CX, 0);
        ctx.lineTo(CX, CY - ROAD_W);
        ctx.moveTo(CX, CY + ROAD_W);
        ctx.lineTo(CX, H);
        ctx.stroke();

        // Yatay orta çizgi
        ctx.beginPath();
        ctx.moveTo(0, CY);
        ctx.lineTo(CX - ROAD_W, CY);
        ctx.moveTo(CX + ROAD_W, CY);
        ctx.lineTo(W, CY);
        ctx.stroke();

        ctx.setLineDash([]);

        // Yaya geçitleri (beyaz çizgiler)
        ctx.fillStyle = "#FFF";
        const stripeW = 10, stripeGap = 8, stripeCount = 7;

        // Üst yatay geçit
        for (let i = 0; i < stripeCount; i++) {
            ctx.fillRect(CX - ROAD_W + 8 + i * (stripeW + stripeGap), CY - ROAD_W - 25, stripeW, 18);
        }
        // Alt yatay geçit
        for (let i = 0; i < stripeCount; i++) {
            ctx.fillRect(CX - ROAD_W + 8 + i * (stripeW + stripeGap), CY + ROAD_W + 7, stripeW, 18);
        }
        // Sol dikey geçit
        for (let i = 0; i < stripeCount; i++) {
            ctx.fillRect(CX - ROAD_W - 25, CY - ROAD_W + 8 + i * (stripeW + stripeGap), 18, stripeW);
        }
        // Sağ dikey geçit
        for (let i = 0; i < stripeCount; i++) {
            ctx.fillRect(CX + ROAD_W + 7, CY - ROAD_W + 8 + i * (stripeW + stripeGap), 18, stripeW);
        }

        // ARAÇ IŞIKLARI (4 tane - her yol için 1)
        // Kuzeyden gelen araçlar için (aşağıda, yolun sağında)
        drawCarLight(ctx, CX + ROAD_W + 15, CY + ROAD_W + 50, getCarLight("NS"));
        // Güneyden gelen araçlar için (yukarıda, yolun solunda)
        drawCarLight(ctx, CX - ROAD_W - 15, CY - ROAD_W - 50, getCarLight("NS"));
        // Doğudan gelen araçlar için (solda, yolun altında)
        drawCarLight(ctx, CX - ROAD_W - 50, CY + ROAD_W + 15, getCarLight("EW"));
        // Batıdan gelen araçlar için (sağda, yolun üstünde)
        drawCarLight(ctx, CX + ROAD_W + 50, CY - ROAD_W - 15, getCarLight("EW"));

        // YAYA IŞIKLARI (8 tane - her geçidin 2 tarafında)
        const pedNS = getPedLight("vertical"); // NS = dikey geçiş
        const pedEW = getPedLight("horizontal"); // EW = yatay geçiş

        // Üst yatay geçit (sol ve sağ taraf)
        drawPedLight(ctx, CX - ROAD_W - 40, CY - ROAD_W - 20, pedEW);
        drawPedLight(ctx, CX + ROAD_W + 40, CY - ROAD_W - 20, pedEW);

        // Alt yatay geçit (sol ve sağ taraf)
        drawPedLight(ctx, CX - ROAD_W - 40, CY + ROAD_W + 20, pedEW);
        drawPedLight(ctx, CX + ROAD_W + 40, CY + ROAD_W + 20, pedEW);

        // Sol dikey geçit (üst ve alt taraf)
        drawPedLight(ctx, CX - ROAD_W - 20, CY - ROAD_W - 40, pedNS);
        drawPedLight(ctx, CX - ROAD_W - 20, CY + ROAD_W + 40, pedNS);

        // Sağ dikey geçit (üst ve alt taraf)
        drawPedLight(ctx, CX + ROAD_W + 20, CY - ROAD_W - 40, pedNS);
        drawPedLight(ctx, CX + ROAD_W + 20, CY + ROAD_W + 40, pedNS);

        // Araçlar
        for (const car of sim.cars) {
            drawCar(ctx, car);
        }

        // Yayalar
        for (const ped of sim.pedestrians) {
            drawPedestrian(ctx, ped);
        }

        // Üst bilgi
        ctx.fillStyle = "#FFF";
        ctx.font = "bold 16px Arial";
        ctx.textAlign = "center";
        const phaseText = sim.phase === 0 ? "🚗 K-G Yeşil | 🚶 D-B Geçebilir" :
            sim.phase === 1 ? "🚗 K-G Sarı" :
                sim.phase === 2 ? "🚗 D-B Yeşil | 🚶 K-G Geçebilir" : "🚗 D-B Sarı";
        ctx.fillText(`${phaseText} - ${Math.ceil(sim.timer)}s`, W / 2, 25);

        // Açıklama
        ctx.font = "12px Arial";
        ctx.fillStyle = "#DDD";
        ctx.fillText("🔴🟢 Araç Işıkları | 🚶 Yaya Işıkları | Tıkla: Video Yükle", W / 2, H - 10);
    };

    // Araç ışığı çiz
    const drawCarLight = (ctx, x, y, color) => {
        // Direk
        ctx.fillStyle = "#444";
        ctx.fillRect(x - 3, y - 5, 6, 40);

        // Işık kutusu
        ctx.fillStyle = "#222";
        ctx.beginPath();
        ctx.roundRect(x - 12, y - 45, 24, 50, 4);
        ctx.fill();

        // 3 ışık
        const lights = [
            { color: "#ef4444", y: y - 35, active: color === "red" },
            { color: "#eab308", y: y - 20, active: color === "yellow" },
            { color: "#22c55e", y: y - 5, active: color === "green" },
        ];

        for (const light of lights) {
            ctx.beginPath();
            ctx.arc(x, light.y, 7, 0, Math.PI * 2);
            ctx.fillStyle = light.active ? light.color : "#333";
            if (light.active) {
                ctx.shadowColor = light.color;
                ctx.shadowBlur = 10;
            }
            ctx.fill();
            ctx.shadowBlur = 0;
        }
    };

    // Yaya ışığı çiz
    const drawPedLight = (ctx, x, y, color) => {
        // Küçük kutu
        ctx.fillStyle = "#222";
        ctx.beginPath();
        ctx.roundRect(x - 10, y - 15, 20, 30, 3);
        ctx.fill();

        // Yaya ikonu (üst = kırmızı dur, alt = yeşil geç)
        // Kırmızı
        ctx.beginPath();
        ctx.arc(x, y - 7, 6, 0, Math.PI * 2);
        ctx.fillStyle = color === "red" ? "#ef4444" : "#333";
        if (color === "red") {
            ctx.shadowColor = "#ef4444";
            ctx.shadowBlur = 8;
        }
        ctx.fill();
        ctx.shadowBlur = 0;

        // Yeşil
        ctx.beginPath();
        ctx.arc(x, y + 7, 6, 0, Math.PI * 2);
        ctx.fillStyle = color === "green" ? "#22c55e" : "#333";
        if (color === "green") {
            ctx.shadowColor = "#22c55e";
            ctx.shadowBlur = 8;
        }
        ctx.fill();
        ctx.shadowBlur = 0;
    };

    // Araç çiz
    const drawCar = (ctx, car) => {
        ctx.save();
        ctx.translate(car.x, car.y);

        let rotation = 0;
        switch (car.dir) {
            case "north": rotation = -Math.PI / 2; break;
            case "south": rotation = Math.PI / 2; break;
            case "east": rotation = 0; break;
            case "west": rotation = Math.PI; break;
        }
        ctx.rotate(rotation);

        // Gövde
        ctx.fillStyle = "#3b82f6";
        ctx.beginPath();
        ctx.roundRect(-25, -12, 50, 24, 5);
        ctx.fill();

        // Cam
        ctx.fillStyle = "#93c5fd";
        ctx.fillRect(10, -8, 12, 16);

        // Farlar
        ctx.fillStyle = "#fef08a";
        ctx.fillRect(23, -8, 4, 5);
        ctx.fillRect(23, 3, 4, 5);

        ctx.restore();
    };

    // Yaya çiz
    const drawPedestrian = (ctx, ped) => {
        const isWaiting = ped.state === "waiting";

        // Gövde
        ctx.fillStyle = isWaiting ? "#f97316" : "#22c55e";
        ctx.beginPath();
        ctx.arc(ped.x, ped.y + 5, 8, 0, Math.PI * 2);
        ctx.fill();

        // Kafa
        ctx.fillStyle = "#fcd34d";
        ctx.beginPath();
        ctx.arc(ped.x, ped.y - 5, 6, 0, Math.PI * 2);
        ctx.fill();

        // Bekliyor ikonu
        if (isWaiting) {
            ctx.fillStyle = "#FFF";
            ctx.font = "10px Arial";
            ctx.textAlign = "center";
            ctx.fillText("⏳", ped.x, ped.y + 22);
        }
    };

    // Tıklama
    const handleClick = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        const scaleX = W / rect.width;
        const scaleY = H / rect.height;
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;

        // Araç ışıklarına tıklama kontrolü
        const carLights = [
            { name: "north", x: CX + ROAD_W + 15, y: CY + ROAD_W + 50 },
            { name: "south", x: CX - ROAD_W - 15, y: CY - ROAD_W - 50 },
            { name: "east", x: CX - ROAD_W - 50, y: CY + ROAD_W + 15 },
            { name: "west", x: CX + ROAD_W + 50, y: CY - ROAD_W - 15 },
        ];

        for (const light of carLights) {
            const dist = Math.sqrt((x - light.x) ** 2 + (y - light.y) ** 2);
            if (dist < 30) {
                setSelectedLight(light.name);
                fileInputRef.current?.click();
                return;
            }
        }
    };

    // Video yükleme
    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (file && selectedLight) {
            const url = URL.createObjectURL(file);
            setVideos(prev => ({ ...prev, [selectedLight]: url }));
        }
        e.target.value = "";
    };

    // Ana döngü
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");

        const loop = (timestamp) => {
            const dt = Math.min((timestamp - lastTimeRef.current) / 1000, 0.1);
            lastTimeRef.current = timestamp;

            update(dt);
            render(ctx);

            animationRef.current = requestAnimationFrame(loop);
        };

        animationRef.current = requestAnimationFrame(loop);

        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        };
    }, [videos]);

    return (
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <canvas
                ref={canvasRef}
                width={W}
                height={H}
                className="w-full rounded-lg cursor-pointer"
                onClick={handleClick}
            />

            <input
                type="file"
                ref={fileInputRef}
                accept="video/*"
                className="hidden"
                onChange={handleFileChange}
            />

            {Object.keys(videos).length > 0 && (
                <div className="mt-4 grid grid-cols-2 gap-2">
                    {Object.entries(videos).map(([name, url]) => (
                        <div key={name} className="relative">
                            <video
                                src={url}
                                className="w-full h-20 object-cover rounded"
                                muted
                                loop
                                autoPlay
                            />
                            <span className="absolute top-1 left-1 bg-black/70 text-white text-xs px-2 py-0.5 rounded">
                                {name === "north" ? "Kuzey" : name === "south" ? "Güney" : name === "east" ? "Doğu" : "Batı"}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
