async function saveCurrentScene(sceneName) {
    if (!currentIP || !currentUsername) {
        console.error("Missing IP or username.");
        return;
    }

    const url = `http://${currentIP}/api/${currentUsername}/scenes`;

    // 1. 获取当前所有灯的状态
    const lights = document.querySelectorAll(".light-container");
    const sceneLights = {};

    lights.forEach(light => {
        const lightID = light.querySelector(".slider").dataset.lightId;
        const bri = parseInt(light.querySelector(".slider").value, 10);
        const ct = parseInt(light.querySelector(".ctBar").value, 10);
        const isOn = light.querySelector(".light-button").classList.contains("on");

        sceneLights[lightID] = {
            on: isOn,
            bri: bri,
            ct: ct
        };
    });

    // 2. 发送请求，把 Scene 存入 Hue API
    const requestData = {
        name: sceneName,  // 场景名称
        lights: Object.keys(sceneLights),  // 受控灯光 ID 列表
        type: "LightScene",  // 固定类型
        lightstates: sceneLights // 灯光状态
    };

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestData)
        });

        const result = await response.json();
        console.log("Scene saved:", result);
        alert(`Scene "${sceneName}" saved!`);
    } catch (error) {
        console.error("Failed to save scene:", error);
    }
}

async function loadExistingScenes() {
    if (!currentIP || !currentUsername) {
        console.error("Missing IP or username.");
        return;
    }

    const url = `http://${currentIP}/api/${currentUsername}/scenes`;

    try {
        const response = await fetch(url);
        const scenes = await response.json();

        const sceneContainer = document.getElementById("sceneContainer");
        sceneContainer.innerHTML = ""; // 清空现有的按钮

        Object.entries(scenes).forEach(([sceneID, scene]) => {
            const button = document.createElement("button");
            button.className = "scene-button";
            button.innerText = scene.name;
            button.dataset.sceneId = sceneID;

            button.addEventListener("click", () => applyScene(sceneID));

            sceneContainer.appendChild(button);
        });

        console.log("Loaded scenes:", scenes);
    } catch (error) {
        console.error("Failed to load scenes:", error);
    }
}

async function applyAPIScene(sceneID) {
    if (!currentIP || !currentUsername) {
        console.error("Missing IP or username.");
        return;
    }

    const url = `http://${currentIP}/api/${currentUsername}/groups/0/action`; // `0` 代表所有灯光组

    try {
        await fetch(url, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ scene: sceneID })
        });

        console.log(`Applied scene ${sceneID}`);
    } catch (error) {
        console.error(`Failed to apply scene ${sceneID}`, error);
    }
}

// 在页面加载时调用
loadExistingScenes();
