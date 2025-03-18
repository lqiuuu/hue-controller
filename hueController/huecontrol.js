let configData = {};  // 存储 JSON 数据
let currentIP = "";    // 当前选择的 IP
let currentUsername = "";  // 当前选择的用户
let lightID = "";      // 通过 API 获取的灯 ID
let currentBrightness = "";  // 默认亮度


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
    // fetchLightID();
    loadLights();
}

// **用户添加新 API Token**
function addNewUser() {
    const newUser = document.getElementById("newUser").value.trim();
    const newToken = document.getElementById("newToken").value.trim();

    if (!currentIP || !newUser || !newToken) {
        alert("请输入用户名和 API Token！");
        return;
    }

    if (!configData[currentIP].users) {
        configData[currentIP].users = {};
    }

    // **添加新用户**
    configData[currentIP].users[newUser] = newToken;

    // **更新用户下拉菜单**
    updateUsers(currentIP);
    document.getElementById("userSelect").value = newToken;
    currentUsername = newToken;
    // fetchLightID();
    loadLights();

    console.log("新用户已添加:", configData);
}

// // **获取 `/lights` 自动选择一个灯**
// async function fetchLightID() {
//     if (!currentIP || !currentUsername) return;
//     const url = `http://${currentIP}/api/${currentUsername}/lights`;

//     try {
//         const response = await fetch(url);
//         const data = await response.json();
//         lightID = Object.keys(data)[0]; // 取第一个灯的 ID
//         updateURLDisplay();
//     } catch (error) {
//         console.error("获取灯 ID 失败:", error);
//         lightID = "";
//     }
// }

// **加载灯的列表**
async function loadLights() {
    if (!currentIP || !currentUsername) return;
    const url = `http://${currentIP}/api/${currentUsername}/lights`;

    try {
        const response = await fetch(url);
        const lights = await response.json();
        
        // 填充选择框
        const lightSelect = document.getElementById("lightSelect");
        lightSelect.innerHTML = Object.entries(lights).map(([id, light]) => 
            `<option value="${id}">${light.name}</option>`
        ).join("");

        // 设置默认选中灯，并获取其亮度
        lightID = Object.keys(lights)[0];  // 默认选第一个灯
        getLightBrightness(lightID);
    } catch (error) {
        console.error("获取灯列表失败:", error);
        lightID = "";
    }
}


// **获取当前亮度**
async function getLightBrightness(lightID) {
    const url = `http://${currentIP}/api/${currentUsername}/lights/${lightID}`;

    try {
        const response = await fetch(url);
        const lightData = await response.json();

        // 获取当前亮度值
        const bri = lightData.state.bri;
        updateSlider(bri);
    } catch (error) {
        console.error("获取亮度失败:", error);
    }
}

// **更新滑块和显示的亮度值**
function updateSlider(brightness) {
    const slider = document.getElementById("slider");
    const sliderValue = document.getElementById("sliderValue");

    // 更新滑块和显示的亮度
    slider.value = brightness;
    sliderValue.textContent = brightness;
    currentBrightness = brightness;
}

// **更新 URL 显示**
function updateURLDisplay() {
    const urlDisplay = document.getElementById("urlDisplay");
    if (currentIP && currentUsername && lightID) {
        urlDisplay.textContent = `请求 URL: http://${currentIP}/api/${currentUsername}/lights/${lightID}/state`;
    } else {
        urlDisplay.textContent = "请选择有效配置";
    }
}

// **监听 IP 选择**
document.getElementById("ipSelect").addEventListener("change", function() {
    updateUsers(this.value);
});

// **监听用户选择**
document.getElementById("userSelect").addEventListener("change", function() {
    currentUsername = this.value;
    // fetchLightID();
    loadLights();
});

// **监听亮度滑块**
document.getElementById("slider").addEventListener("input", function() {
    document.getElementById("sliderValue").textContent = this.value;
    updateBrightness(this.value);
});

// 监听 <select> 变化，更新 lightID，并获取亮度
document.getElementById("lightSelect").addEventListener("change", function() {
    lightID = this.value;  // 更新 lightID 为用户选中的灯
    console.log("当前选择的灯 ID:", lightID);
    getLightBrightness(lightID);  // 立即获取新的灯的亮度
});


// **发送 PUT 请求调整亮度**
async function updateBrightness(brightness) {
    if (!currentIP || !currentUsername || !lightID) return;

    const url = `http://${currentIP}/api/${currentUsername}/lights/${lightID}/state`;
    const requestData = { on: true, bri: parseInt(brightness, 10) };

    try {
        const response = await fetch(url, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestData),
        });

        const responseData = await response.json();
        console.log("Hue 响应:", responseData);
        document.getElementById("response").textContent = "update bri to: " + brightness;
    } catch (error) {
        console.error("请求失败:", error);
        document.getElementById("response").textContent = "请求失败!";
    }
}

// **绑定添加用户按钮**
document.getElementById("addUserBtn").addEventListener("click", addNewUser);

 // **初始化**
loadConfig();