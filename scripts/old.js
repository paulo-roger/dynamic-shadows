import { MODULE, MODULE_DIR } from "./const.js"; //import the const variables
import { chatMessage } from "./util.js"
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
    //compatibility with v9
    // if (fvttVersion < 10) {
    // }
});

// Hooks.once("refreshToken", async (token) => {
//     console.log(" ====================================== 🕵 Hook Refresh token  ======================================= ", token)
//     if (token !== undefined)
//         /* await */ createManyShadows(token.document, token.x, token.y);

// });

// Hooks.on("refreshToken", async (token) => {
//     console.log(" ====================================== 🕵 Hook Refresh token  ======================================= ", CanvasAnimation.animations.isPrototypeOf())
//     console.log(CanvasAnimation.getAnimation('Token.soPFQpa4y60ybpLt.animate'))
//     // console.log("*********************Time:",CanvasAnimation.getAnimation(CanvasAnimation.animations.valueOf()).duration)
//     console.log(`token X: ${token.x}, token Y: ${token.y}`)
// });


Hooks.on("preUpdateToken", async (token, updateData) => {
    let tokenX = getProperty(updateData, "x");
    let tokenY = getProperty(updateData, "y");
    let originX = token.x
    let originY = token.y

    await new Promise(resolve => setTimeout(resolve, 100));
    console.log("************novo movimento *************************", CanvasAnimation.getAnimation(`Token.${token.id}.animate`).duration)
    await new Promise(resolve =>
        setTimeout(resolve, CanvasAnimation.getAnimation(`Token.${token.id}.animate`).duration + 100))
    // .then(() => {

    if (canvas.tokens.get(token.id).light.active === true && (tokenX !== undefined || tokenY !== undefined)) {
        ui.notifications.info('esse cara tem luz')
    }

    if (tokenX !== undefined && tokenY === undefined) {
        tokenY = originY
        /* await */ createManyShadows(token, tokenX, tokenY);
    }
    else if (tokenX === undefined && tokenY !== undefined) {
        tokenX = originX
        /* await */ createManyShadows(token, tokenX, tokenY);
    } else if (tokenX !== undefined && tokenY !== undefined) {
        /* await */ createManyShadows(token, tokenX, tokenY);
    }
    // });
});


function radToDeg(rad) {
    return rad / (Math.PI / 180);
}

async function createManyShadows(token, tokenX, tokenY) {
    // let adistance
    // if (atokenX || atokenY === 0)
    //     adistance = Math.abs(atokenX + atokenY)
    // else adistance = Math.hypot(atokenX, atokenY)
    // console.log(` ====================================== DISTANCE : ${adistance}  ======================================= `)
    // Hooks.on("refreshToken", async (tokenRef) => {
    // let tokenX = tokenRef.x
    // let tokenY = tokenRef.y
    let canvasToken = canvas.tokens.get(token.id)
    // console.log(" ====================================== 🕵 Shadows  ======================================= ")
    let lightsInScene = canvas.scene.lights.filter(i => i.hidden === false)
    let tokensLightsInScene = canvas.tokens.objects.children.filter(i => i.light.active === true)
    for (var i = 0; i < lightsInScene.length; i++) {
        let lightX = lightsInScene[i].x
        let lightY = lightsInScene[i].y
        let catop = tokenY - lightY + (canvas.scene.grid.size / 2)
        let catad = tokenX - lightX + (canvas.scene.grid.size / 2)
        let arctan = Math.atan(catop / catad)
        let distance = Math.hypot(catop, catad) / (canvas.scene.grid.size / canvas.scene.grid.distance)
        let lightRadius = lightsInScene[i].config.dim
        arctan = radToDeg(arctan)

        // console.log(` ====================================== sombra n.${i} ======================================= `)
        // console.log(`light X: ${lightX}, light Y: ${lightY}, token X: ${tokenX}, token Y: ${tokenY}, raio da luz:${lightRadius}`)
        // console.log(`cat oposto: ${catop}, cat adjacente: ${catad}, arc tangente: ${arctan}, distancia da Luz: ${distance}`)

        if ((distance + (canvas.scene.grid.distance / 2)) <= lightRadius) {
            await castShadow(canvasToken, catad, arctan, lightsInScene[i].id)
        }
        else if (canvasToken.TMFXhasFilterId(lightsInScene[i].id)) {
            await canvasToken.TMFXdeleteFilters(lightsInScene[i].id)
        }
    }
    for (var i = 0; i < tokensLightsInScene.length; i++) {
        let lightX = tokensLightsInScene[i].light.x
        let lightY = tokensLightsInScene[i].light.y
        let catop = tokenY - lightY + (canvas.scene.grid.size / 2)
        let catad = tokenX - lightX + (canvas.scene.grid.size / 2)
        let arctan = Math.atan(catop / catad)
        let distance = Math.hypot(catop, catad) / (canvas.scene.grid.size / canvas.scene.grid.distance)
        let lightRadius = tokensLightsInScene[i].light.radius
        arctan = radToDeg(arctan)

        console.log(` ====================================== sombra n.${i} ======================================= `)
        console.log(`light X: ${lightX}, light Y: ${lightY}, token X: ${tokenX}, token Y: ${tokenY}, raio da luz:${lightRadius}`)
        console.log(`cat oposto: ${catop}, cat adjacente: ${catad}, arc tangente: ${arctan}, distancia da Luz: ${distance}`)

        if ((distance + (canvas.scene.grid.distance / 2)) <= lightRadius / (canvas.scene.grid.size / canvas.scene.grid.distance)) {
            await castShadow(canvasToken, catad, arctan, tokensLightsInScene[i].id)
        }
        else if (canvasToken.TMFXhasFilterId(tokensLightsInScene[i].id)) {
            await canvasToken.TMFXdeleteFilters(tokensLightsInScene[i].id)
        }
    }
    // });

}

async function castShadow(canvasToken, catad, arctan, id) {
    let shadowAngle = arctan
    if (catad < 0) shadowAngle = arctan + 180
    let params =
        [{
            filterType: "shadow",
            filterId: id,
            rotation: shadowAngle,
            blur: 2,
            quality: 2,
            distance: 20,
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
                    val2: 4
                },
                rotation:
                {
                    active: true,
                    loopDuration: 100,
                    animType: "syncSinOscillation",
                    val1: shadowAngle,
                    val2: shadowAngle + 4
                }
            }
        }];
    await TokenMagic.addUpdateFilters(canvasToken, params);
}

//canvas.scene.lights (é uma embedded collection)
//canvas.lighting.placeables[0].x
// canvas.lighting.objects.children[0].document.x
// let lightY = 525
// let lightX = 875


// function shadow() {
//     let lightsInScene = canvas.scene.lights.filter(i => i.hidden === false)
//     let tokensLightsInScene = canvas.tokens.objects.children.filter(i => i.light.active === true)
//     let light
//     if (lightsInScene.length >= 0) {
//         light = new Light(lightsInScene[i].x, lightsInScene[i].y, lightsInScene[i].config.dim, lightsInScene[i].id)
//     }
//     if (tokensLightsInScene.length >= 0) {
//         light = new Light(tokensLightsInScene[i].x, tokensLightsInScene[i].y, tokensLightsInScene[i].config.dim, tokensLightsInScene[i].id)
//     }
// }

// class Light {
//     constructor(x, y, radius, id) {
//         this.x = x,
//             this.y = y,
//             this.radius = radius,
//             this.id = id

//     }
// }

// function calcShadow(light) {
//     let lightX = light.x
//     let lightY = light.y
//     let catop = tokenY - lightY + (canvas.scene.grid.size / 2)
//     let catad = tokenX - lightX + (canvas.scene.grid.size / 2) //precisa retornar
//     let arctan = Math.atan(catop / catad)
//     let distance = Math.hypot(catop, catad) / (canvas.scene.grid.size / canvas.scene.grid.distance) //precisa retornar
//     let lightRadius = light.config.dim //precisa retornar
//     arctan = radToDeg(arctan) //precisa retornar
// }
