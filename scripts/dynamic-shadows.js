import { MODULE, MODULE_DIR } from "./const.js"; //import the const variables
import { registerSettings, cacheSettings } from "./settings.js" //import settings

//Compatibility with v9
let fvttVersion

// Hook that trigger once when the game is initiated. Register and cache settings.
Hooks.once("init", () => {
    // registerWrappers();
    // registerSettings();
    // cacheSettings();
});

// hook to check the foundry version and to show the module is loaded.
Hooks.once('ready', async function () {
    fvttVersion = parseInt(game.version)
    console.log(" ====================================== 🕵 Shadows  ======================================= ")
    console.log(" ==================================== FoundryVTT Version:", fvttVersion, " ==================================== ")
});

// hook that triggers every time the light refresh, check light collision for every token in the ground level (for now lets keep it simple) and that is visible.
Hooks.on("lightingRefresh", async () => {
    let tokens = canvas.scene.tokens.contents.filter(i => i.elevation === 0 && i.hidden === false)
    for (var i = 0; i < tokens.length; i++) {
        await lightCollision(tokens[i], tokens[i].x, tokens[i].y)
    }
});

// convert radians to degrees
function radToDeg(rad) {
    return rad / (Math.PI / 180);
}

// calc the sides of the triangle
function cathetus(tokenXY, lightXY) {
    return tokenXY - lightXY + (canvas.scene.grid.size / 2)
}

// hypothenuse + adjust using canvas grid properties to use the center point of the square. Using the grid properties makes the code adjustable to any grid size or unit
function calcDistance (cathetusA, cathetusB){
   return (Math.hypot(cathetusA, cathetusB) / (canvas.scene.grid.size / canvas.scene.grid.distance)) + (canvas.scene.grid.distance / 2)
}

// checks light collision with the token
async function lightCollision(token, tokenX, tokenY) {
    let canvasToken = canvas.tokens.get(token.id)
    // console.log(" ====================================== 🕵 DEBUG: Shadows  ======================================= ")
    let lightsInScene = canvas.scene.lights.filter(i => i.hidden === false) // array of lights in the scene that are not faded.
    let tokensLightsInScene = canvas.tokens.objects.children.filter(i => i.light.active === true) // array of tokens that are emitting light.
    for (var i = 0; i < lightsInScene.length; i++) {
        // console.log(" ====================================== 🕵 DEBUG: lightingRefresh - LIGHTS 💡  ======================================= ")
        let lightX = lightsInScene[i].x
        let lightY = lightsInScene[i].y
        let OpoCathetus = cathetus(tokenY, lightY)
        let adjCathetus = cathetus(tokenX, lightX)
        let distance = calcDistance(OpoCathetus, adjCathetus) //distance of the center of the token square to the center of the light square
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

        //this if is for the shadow of the torch holder, creates a shadow below her/him.
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

// creates the shadow with the parameters params below.
async function castShadow(canvasToken, adjCathetus, OpoCathetus, id) {
    let shadowAngle = Math.round(radToDeg(Math.atan(OpoCathetus / adjCathetus))) // angle of the shadow around the token.
    if (adjCathetus < 0) shadowAngle += 180 // adjust the angle in case of the adjacent cathetus is  negative
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
                rotation: //makes the shadow flickers
                {
                    active: true,
                    loopDuration: 300,
                    animType: "syncSinOscillation",
                    val1: shadowAngle,
                    val2: shadowAngle + 4
                }
            }
        }];
    if (canvasToken.document.getFlag('tokenmagic', 'filters') !== undefined) { // this part is to optmize the code, if the shadow already exists and the angle didn't change, do nothing. else apply the shadow filter.
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