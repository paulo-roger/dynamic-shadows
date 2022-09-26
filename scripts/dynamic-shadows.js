import { MODULE, MODULE_DIR } from "./const.js"; //import the const variables
// import { registerSettings, cacheSettings, enableFT, enableForAll, scaleFT, enableZoom, chatOutput, notificationOutput } from "./settings.js" //import settings
// import { FlyingHud } from "./flying-hud.js"

//Compatibility with v9
let fvttVersion

// Hook that trigger once when the game is initiated. Register and cache settings.
Hooks.once("init", () => {
    // registerWrappers();
    // registerSettings();
    // cacheSettings();
});

Hooks.once('ready', async function () {
    fvttVersion = parseInt(game.version)
    console.log(" ====================================== 🕵 Shadows  ======================================= ")
    console.log(" ==================================== FoundryVTT Version:", fvttVersion, " ==================================== ")
});

Hooks.on("lightingRefresh", async () => {
    let tokens = canvas.scene.tokens.contents.filter(i => i.elevation === 0 && i.hidden === false)
    for (var i = 0; i < tokens.length; i++) {
        await lightCollision(tokens[i], tokens[i].x, tokens[i].y)
    }
});

function radToDeg(rad) {
    return rad / (Math.PI / 180);
}

function cathetus(tokenXY, lightXY) {
    return tokenXY - lightXY + (canvas.scene.grid.size / 2)
}

function calcDistance (cathetusA, cathetusB){
   return (Math.hypot(cathetusA, cathetusB) / (canvas.scene.grid.size / canvas.scene.grid.distance)) + (canvas.scene.grid.distance / 2)
}

async function lightCollision(token, tokenX, tokenY) {
    let canvasToken = canvas.tokens.get(token.id)
    // console.log(" ====================================== 🕵 DEBUG: Shadows  ======================================= ")
    let lightsInScene = canvas.scene.lights.filter(i => i.hidden === false)
    let tokensLightsInScene = canvas.tokens.objects.children.filter(i => i.light.active === true)
    for (var i = 0; i < lightsInScene.length; i++) {
        // console.log(" ====================================== 🕵 DEBUG: lightingRefresh - LIGHTS 💡  ======================================= ")
        let lightX = lightsInScene[i].x
        let lightY = lightsInScene[i].y
        let OpoCathetus = cathetus(tokenY, lightY)
        let adjCathetus = cathetus(tokenX, lightX)
        let distance = calcDistance(OpoCathetus, adjCathetus)
        let lightRadius = lightsInScene[i].config.dim

        // console.log(` ====================================== sombra n.${i} ======================================= `)
        // console.log(`light X: ${lightX}, light Y: ${lightY}, token X: ${tokenX}, token Y: ${tokenY}, raio da luz:${lightRadius}`)
        // console.log(`cat oposto: ${OpoCathetus}, cat adjacente: ${adjCathetus}, distancia da Luz: ${distance}`)

        if ((distance) <= lightRadius) {
            await castShadow(canvasToken, adjCathetus, OpoCathetus, lightsInScene[i].id)
            // console.log(" ====================================== 🕵 DEBUG: REFRESHING SHADOW  ======================================= ")
        }
        else if (canvasToken.TMFXhasFilterId(lightsInScene[i].id)) {
            // console.log(" ====================================== 🕵 DEBUG: REMOVING SHADOW  ======================================= ")
            await canvasToken.TMFXdeleteFilters(lightsInScene[i].id)
        }
    }
    for (var i = 0; i < tokensLightsInScene.length; i++) {
        // console.log(" ====================================== 🕵 DEBUG: lightingRefresh - TOKENS ⛹ ======================================= ")
        let lightX = tokensLightsInScene[i].light.x
        let lightY = tokensLightsInScene[i].light.y
        let OpoCathetus = cathetus(tokenY, lightY)
        let adjCathetus = cathetus(tokenX, lightX)
        let distance = calcDistance(OpoCathetus, adjCathetus)
        let lightRadius = tokensLightsInScene[i].light.radius

        // console.log(` ====================================== sombra n.${i} ======================================= `)
        // console.log(`light X: ${lightX}, light Y: ${lightY}, token X: ${tokenX}, token Y: ${tokenY}, raio da luz:${lightRadius}`)
        // console.log(`cat oposto: ${OpoCathetus}, cat adjacente: ${adjCathetus}, distancia da Luz: ${distance}`)

        if (token.id == tokensLightsInScene[i].id) {
            if (!canvasToken.TMFXhasFilterId(token.id)) {
                await castSelfShadow(canvasToken, tokensLightsInScene[i].id)
            }
        }
        else {
            if ((distance) <= lightRadius) {
                // console.log(" ====================================== 🕵 DEBUG: REFRESHING SHADOW  ======================================= ")
                await castShadow(canvasToken, adjCathetus, OpoCathetus, tokensLightsInScene[i].id)
            }
            else if (canvasToken.TMFXhasFilterId(tokensLightsInScene[i].id)) {
                await canvasToken.TMFXdeleteFilters(tokensLightsInScene[i].id)
                // console.log(" ====================================== 🕵 DEBUG: REMOVING SHADOW  ======================================= ")
            }
        }
    }
}

async function castShadow(canvasToken, adjCathetus, OpoCathetus, id) {
    let shadowAngle = Math.round(radToDeg(Math.atan(OpoCathetus / adjCathetus)))
    if (adjCathetus < 0) shadowAngle += 180
    console.log(` ====================================== SHADOW ANGLE: ${shadowAngle} ======================================= `)
    let params =
        [{
            filterType: "shadow",
            filterId: id,
            rotation: shadowAngle,
            blur: 2,
            quality: 4,
            distance: (canvas.scene.grid.size / 2),
            alpha: 0.6,
            padding: 10,
            shadowOnly: false,
            color: 0x000000,
            zOrder: 6000,
            animated:
            {
                blur:
                {
                    active: true,
                    loopDuration: 500,
                    animType: "syncCosOscillation",
                    val1: 2,
                    val2: 3
                },
                rotation:
                {
                    active: true,
                    loopDuration: 300,
                    animType: "syncSinOscillation",
                    val1: shadowAngle,
                    val2: shadowAngle + 4
                }
            }
        }];
    if (canvasToken.document.getFlag('tokenmagic', 'filters') !== undefined) {
        if (canvasToken.document.getFlag('tokenmagic', 'filters').find(i => i.tmFilters.tmParams.rotation === shadowAngle) === undefined)
            await TokenMagic.addUpdateFilters(canvasToken, params);
    } else await TokenMagic.addUpdateFilters(canvasToken, params);
}

async function castSelfShadow(canvasToken, id) {
    let shadowAngle = 90
    let params =
        [{
            filterType: "shadow",
            filterId: id,
            rotation: shadowAngle,
            blur: 2,
            quality: 4,
            distance: (canvas.scene.grid.size / 3),
            alpha: 0.5,
            padding: 10,
            shadowOnly: false,
            color: 0x000000,
            zOrder: 6000,
            animated:
            {
                blur:
                {
                    active: true,
                    loopDuration: 500,
                    animType: "syncCosOscillation",
                    val1: 2,
                    val2: 3
                },
                rotation:
                {
                    active: true,
                    loopDuration: 200,
                    animType: "syncSinOscillation",
                    val1: shadowAngle,
                    val2: shadowAngle + 4
                }
            }
        }];
    await TokenMagic.addUpdateFilters(canvasToken, params);
}