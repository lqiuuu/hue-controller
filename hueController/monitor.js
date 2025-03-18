let configData = {};  // store hub & user info
let currentIP = "";    // hub in use
let currentUsername = "";  // username inuse
let lightID = "";      // the lightId from API

let lastBriValue, lastCtValue, lastOnValue;


// load JSON
async function loadConfig() {
    try {
        const response = await fetch("config.json");
        configData = await response.json();
        populateIPSelect();
    } catch (error) {
        console.error("Failed loading config:", error);
    }
}

// load hub id
function populateIPSelect() {
    const ipSelect = document.getElementById("ipSelect");
    ipSelect.innerHTML = Object.keys(configData).map(ip => `<option value="${ip}">${ip}</option>`).join("");
    updateUsers(ipSelect.value);
}

// load user list
function updateUsers(selectedIP) {
    currentIP = selectedIP;
    const userSelect = document.getElementById("userSelect");
    userSelect.innerHTML = Object.entries(configData[selectedIP].users)
        .map(([user, token]) => `<option value="${token}">${user}</option>`)
        .join("");
    currentUsername = userSelect.value;
    loadLights();
}

// listen to hub change
document.getElementById("ipSelect").addEventListener("change", function() {
    updateUsers(this.value);
});

// listen to user change->
document.getElementById("userSelect").addEventListener("change", function() {
    currentUsername = this.value;
    loadLights();
});

// create switch and control bars for each light on the hub
async function loadLights() {
    if (!currentIP || !currentUsername) return;
    const url = `http://${currentIP}/api/${currentUsername}/lights`;
    

    try {
        const response = await fetch(url);
        const lights = await response.json();

        console.log("load lights:", lights);

        const container = document.getElementById("lightsContainer");
        container.innerHTML = ""; //clear what was on the page before
        
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
            slider.dataset.lightId = id;  //link to light id
        
            const briSpan = document.createElement("span"); // bri value
            briSpan.className = "briValue"
            briSpan.innerText = "loading...";

            //on-off switch button
            const button = document.createElement("button");
            button.className = `light-button ${light.state.on ? "on" : ""}`;
            button.innerText = `${light.state.on ? "◯" : "－"}`;
            button.dataset.lightId = id;

            //fill the controller bars
            lightDiv.appendChild(label);
            lightDiv.appendChild(button);
            lightDiv.appendChild(slider);
            lightDiv.appendChild(briSpan);
            lightDiv.appendChild(ctBar);

            container.appendChild(lightDiv);

            // get & set current parameters
        getLightParas(id, slider, ctBar, briSpan, button);

        // listen to value update, and PUT to api
        slider.addEventListener("input", function () {
            briSpan.innerText = this.value;
            updateLightBrightness(id, this.value);
        });
        ctBar.addEventListener("input", function(){
            updateLightCt(id, this.value);
        });
        button.addEventListener("click", () => toggleLight(id, button));
    

        // sync after all lights loaded
         if (!window.syncInterval) {
        startSync();
        }
        
    });


        
    } catch (error) {
        console.error("Failed loadLights:", error);
        lightID = "";
    }
}

// get current light state parameters
async function getLightParas(lightID, slider, ctBar, briSpan, button) {
    const url = `http://${currentIP}/api/${currentUsername}/lights/${lightID}`;

    try {
        const response = await fetch(url, { method: "GET", cache: "no-cache" });
        if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
        const lightData = await response.json();

        // get current bri
        const bri = lightData.state.bri;
        const ct = lightData.state.ct;
        // // updateSlider(bri);
        // slider.value = bri;  
        // briSpan.innerText = bri; 
        // ctBar.value = ct; 

        const isOn = lightData.state.on;

        //update sliders&button when detect value change
        //once in a certain period
        if (slider.value !== bri.toString()) {
            smoothTransition(slider, bri);
            briSpan.innerText = bri;
        }

        if (ctBar.value !== ct.toString()) {
            smoothTransition(ctBar, ct);
        }

        if (button.classList.contains("on") !== isOn) {
            button.classList.toggle("on", isOn);
            button.innerText = isOn ? "◯" : "－";
        }

       

    } catch (error) {
        console.error("Failed getLightParas:", error);
        await new Promise(resolve => setTimeout(resolve, 5000));
    }
}


//on off switch
async function toggleLight(lightID, button) {
    if (!currentIP || !currentUsername || !lightID) return;
    
    const url = `http://${currentIP}/api/${currentUsername}/lights/${lightID}/state`;
    
    const currentState = button.classList.contains("on"); // read current on/off
    const newState = !currentState; // count new on/off 

    try {
        await fetch(url, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ on: newState })            
        });

        // 更新 UI
        button.classList.toggle("on", newState);
        button.innerText = `${newState ? "◯" : "－"}`;
        console.log(`now LIGHT ${lightID} is ${newState}`);
    } catch (error) {
        console.error(`Light${lightID} failed to switch:`, error);
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

        console.log(`now LIGHT ${lightID} bri is ${brightness}`);
    } catch (error) {
        console.error(`Failed to update LIGHT ${lightID}`, error);
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

        console.log(`now LIGHT ${lightID} ct is ${ct}`);
    } catch (error) {
        console.error(`Failed to update LIGHT ${lightID} `, error);
    }
}


async function scene1(group) {
    
}


loadConfig();

async function startSync() {
    if (!currentIP || !currentUsername) {
        console.error("Sync Failed：currentIP or currentUsername is not defined");
        return;
    }

    console.log("Now syncing light status...");

    async function syncLoop() {
        try {
            // go through all the exsiting lights
            const containers = document.querySelectorAll(".light-container");
            for (const container of containers) {
                const slider = container.querySelector(".slider");
                const briSpan = container.querySelector(".briValue");
                const ctBar = container.querySelector(".ctBar");
                const button = container.querySelector(".light-button");

                if (slider && briSpan && ctBar && button) {
                    const lightID = slider.dataset.lightId;
                    if (!lightID) {
                        console.warn("! can't find this light，skip");
                        continue;
                    }
                    await getLightParas(lightID, slider, ctBar, briSpan, button);
                } else {
                    console.warn("!some UI not rendered，skip");
                }
                
                // wait 100ms to sendrequest for the next lght
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            // sync every 3s
            setTimeout(syncLoop, 3000);

        } catch (error) {
            console.error("Sync error", error);
        }
    }

    syncLoop(); // 
}

//smooth animation
function smoothTransition(slider, targetValue, duration = 500) {
    const startValue = parseInt(slider.value, 10);
    const startTime = performance.now();

    function update() {
        const elapsedTime = performance.now() - startTime;
        const progress = Math.min(elapsedTime / duration, 1); // animation progress (0~1)
        
        // easeInOutQuad
        const easedProgress = progress < 0.5 
            ? 2 * progress * progress 
            : 1 - Math.pow(-2 * progress + 2, 2) / 2;

        const newValue = Math.round(startValue + (targetValue - startValue) * easedProgress);
        slider.value = newValue;

        if (progress < 1) {
            requestAnimationFrame(update);
        } else {
            slider.value = targetValue; // make sure the final position matches
        }
    }

    requestAnimationFrame(update);
}