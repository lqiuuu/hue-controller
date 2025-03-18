let configData = {};  // 存储 JSON 数据
let currentIP = "";    // 当前选择的 IP
let currentUsername = "";  // 当前选择的用户
let lightID = "";      // 通过 API 获取的灯 ID
let currentBrightness = "";  // 默认亮度

let lastBriValue, lastCtValue, lastOnValue;


// **加载 JSON 配置**
async function loadConfig() {
    try {
        const response = await fetch("config.json");
        configData = await response.json();
        populateIPSelect();
    } catch (error) {
        console.error("加载配置失败:", error);
    }
}

// **填充 IP 下拉菜单**
function populateIPSelect() {
    const ipSelect = document.getElementById("ipSelect");
    ipSelect.innerHTML = Object.keys(configData).map(ip => `<option value="${ip}">${ip}</option>`).join("");
    updateUsers(ipSelect.value);
}

// **填充用户下拉菜单**
function updateUsers(selectedIP) {
    currentIP = selectedIP;
    const userSelect = document.getElementById("userSelect");
    userSelect.innerHTML = Object.entries(configData[selectedIP].users)
        .map(([user, token]) => `<option value="${token}">${user}</option>`)
        .join("");
    currentUsername = userSelect.value;
    loadLights();
}

// **监听 IP 选择**
document.getElementById("ipSelect").addEventListener("change", function() {
    updateUsers(this.value);
});

// **监听用户选择**
document.getElementById("userSelect").addEventListener("change", function() {
    currentUsername = this.value;
    loadLights();
});

// 遍历所有灯，并创建 slider
async function loadLights() {
    if (!currentIP || !currentUsername) return;
    const url = `http://${currentIP}/api/${currentUsername}/lights`;
    

    try {
        const response = await fetch(url);
        const lights = await response.json();

        console.log("灯数据:", lights);

        const container = document.getElementById("lightsContainer");
        container.innerHTML = ""; // 清空之前的内容
        
        Object.entries(lights).forEach(([id, light]) => {
            const lightDiv = document.createElement("div");
            lightDiv.className = "light-container";

            const ctBar = document.createElement("input");
            ctBar.type = "range";
            ctBar.min = "250";
            ctBar.max = "454";
            ctBar.className = "ctBar";
            ctBar.dataset.lightId = id;
        
            const label = document.createElement("label");
            label.innerText = light.name;
        
            const slider = document.createElement("input");
            slider.type = "range";
            slider.min = "1";
            slider.max = "254";
            slider.className = "slider";
            slider.dataset.lightId = id;  // 绑定灯的 ID
            // slider.style.width = "50px"; // 适当调整宽度
        
            const briSpan = document.createElement("span"); // 显示亮度
            briSpan.className = "briValue"
            briSpan.innerText = "loading...";

            //on-off switch button
            const button = document.createElement("button");
            button.className = `light-button ${light.state.on ? "on" : ""}`;
            button.innerText = `${light.state.on ? "◯" : "－"}`;
            button.dataset.lightId = id;

            // 填充控制栏
            lightDiv.appendChild(label);
            lightDiv.appendChild(button);
            lightDiv.appendChild(slider);
            lightDiv.appendChild(briSpan);
            lightDiv.appendChild(ctBar);

            container.appendChild(lightDiv);

            // 获取并设置当前灯的亮度&ct
        getLightParas(id, slider, ctBar, briSpan, button);

        // 添加事件监听，拖动时更新灯的亮度
        slider.addEventListener("input", function () {
            briSpan.innerText = this.value; // 显示当前亮度v
            updateLightBrightness(id, this.value);
        });
        ctBar.addEventListener("input", function(){
            updateLightCt(id, this.value);
        });
        button.addEventListener("click", () => toggleLight(id, button));
        // 监听 HTML 变化（如 API 更新）
        const observer = new MutationObserver(() => {
        console.log("bri被外部修改:", slider.value);
        });
        observer.observe(slider, { attributes: true, attributeFilter: ["value"] });

        // **确保所有灯都加载完后再启动同步**
         if (!window.syncInterval) {
        startSync();
        }
        
    });


        
    } catch (error) {
        console.error("获取灯列表失败:", error);
        lightID = "";
    }
}

// **获取当前亮度&ct**
async function getLightParas(lightID, slider, ctBar, briSpan, button) {
    const url = `http://${currentIP}/api/${currentUsername}/lights/${lightID}`;

    try {
        const response = await fetch(url);
        const lightData = await response.json();

        // 获取当前亮度值
        const bri = lightData.state.bri;
        const ct = lightData.state.ct;
        // // updateSlider(bri);
        // slider.value = bri;  // 设置 slider 初始值
        // briSpan.innerText = bri; // 显示亮度
        // ctBar.value = ct; 

        const isOn = lightData.state.on;

        // 仅当值有变化时才更新 UI，避免页面闪烁
        //定期同步
        if (slider.value !== bri.toString()) {
            slider.style.transition = "all 0.5s ease-in-out";
            slider.value = bri;
            briSpan.innerText = bri;
        }

        if (ctBar.value !== ct.toString()) {
            ctBar.style.transition = "all 0.5s ease-in-out";
            ctBar.value = ct;
        }

        if (button.classList.contains("on") !== isOn) {
            button.classList.toggle("on", isOn);
            button.innerText = isOn ? "◯" : "－";
        }

       

    } catch (error) {
        console.error("获取亮度失败:", error);
    }
}


//开关
async function toggleLight(lightID, button) {
    if (!currentIP || !currentUsername || !lightID) return;
    
    const url = `http://${currentIP}/api/${currentUsername}/lights/${lightID}/state`;
    
    const currentState = button.classList.contains("on"); // 读取当前 UI 状态
    const newState = !currentState; // 计算新的 on/off 状态

    try {
        await fetch(url, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ on: newState })            
        });

        // 更新 UI
        button.classList.toggle("on", newState);
        button.innerText = `${newState ? "◯" : "－"}`;
        console.log(`now 灯${lightID} is ${newState}`);
    } catch (error) {
        console.error(`灯${lightID} 切换灯光失败:`, error);
    }
}


// **发送 PUT 请求调整亮度**
async function updateLightBrightness(lightID, brightness) {
    if (!currentIP || !currentUsername || !lightID) return;

    const url = `http://${currentIP}/api/${currentUsername}/lights/${lightID}/state`;
    const requestData = { bri: parseInt(brightness, 10) };

    try {
        const response = await fetch(url, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestData),
        });

        console.log(`灯 ${lightID} bri更新为: ${brightness}`);
    } catch (error) {
        console.error(`更新灯 ${lightID} 失败:`, error);
    }
}

async function updateLightCt(lightID,  ct) {
    if (!currentIP || !currentUsername || !lightID) return;

    const url = `http://${currentIP}/api/${currentUsername}/lights/${lightID}/state`;
    const requestData = { ct: parseInt(ct, 10) };

    try {
        const response = await fetch(url, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestData),
        });

        console.log(`灯 ${lightID} ct更新为: ${ct}`);
    } catch (error) {
        console.error(`更新灯 ${lightID} 失败:`, error);
    }
}


async function scene1(group) {
    
}


loadConfig();
function startSync() {
    // 如果已经有定时器在运行，就清除它，防止重复执行
    if (window.syncInterval) {
        clearInterval(window.syncInterval);
    }

    // **每 5 秒同步一次灯光状态**
    window.syncInterval = setInterval(() => {
        if (currentIP && currentUsername) {
            console.log("同步灯光状态...");

            document.querySelectorAll(".light-container").forEach(container => {
                const slider = container.querySelector(".slider");
                const briSpan = container.querySelector(".briValue");
                const ctBar = container.querySelector(".ctBar");
                const button = container.querySelector(".light-button");

                // **确保所有元素都存在才调用 getLightParas**
                if (slider && briSpan && ctBar && button) {
                    const lightID = slider.dataset.lightId;
                    getLightParas(lightID, slider, ctBar, briSpan, button);
                } else {
                    console.warn("部分元素未找到，跳过同步");
                }
            });
        }
    }, 5000);
}
