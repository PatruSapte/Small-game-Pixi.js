import { Application, Ticker,Assets,Texture, Container,Sprite,TilingSprite } from "pixi.js";
import {CameraHandler} from "./Camera.ts";
import {Physics, GameObject} from "./GameObject.ts";
import {ObjectsSpawner} from "./ObjectsLifeManager.ts";
const BACKGROUND_PATH = "/assets/background_gradient.png";


(async () => {
     const app = new Application({
        width: 1000,
        height: 800,       
        backgroundColor: "purple",
      });

    const groundTex : Texture = await Assets.load("assets/ground.png");
    const ground = new TilingSprite(groundTex, 128*30,128*30);
    ground.y = app.screen.y + app.screen.height/2;


    ground.scale.set(0.6,0.6);

    const bgStage = new Container();
    bgStage.addChild(ground);
    
    const cloudTex : Texture = await Assets.load("assets/cloud1.png"); 
    //const cloudSprite = new PhysicsObject({x:3, y:0},2,500, 250,cloudTex);
    //cloudSprite.alpha = .75;
    //bgStage.addChild(cloudSprite);
    //cloudSprite.position.y = 200;
    
    const physics : Physics = new Physics(); 
    //physics.add(cloudSprite);
    app.stage.eventMode = "static";
  
    const bgTex : Texture = await Assets.load(BACKGROUND_PATH);
    const camera = new CameraHandler(app, bgTex);
    camera.addChild(bgStage);
    const spawner = new ObjectsSpawner(app,camera, bgStage);
    (app.view as HTMLCanvasElement).addEventListener("contextmenu", (e) => {e.preventDefault();}); //right click menu disabler     
    const stageDiv = document.getElementById("canvas-container");
      if(stageDiv){
        stageDiv.appendChild(app.view as HTMLCanvasElement);
      }
})();


