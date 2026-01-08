import {Container, Texture, Application,Ticker, Assets, Point} from "pixi.js";
import { GameObject, SpriteObject, Physics } from "./GameObject";
import {CameraHandler} from "./Camera";
import { lerp } from "./Utils";

const HORIZONTAL_THRESHOLD = 15; //if speed on x axis lower than this value, spawn on both sides of screen(topleft-bottomleft and topright-bottomright) is possible, if speed higher then we can spawn only on the side of our moving direction 
const VERTICAL_THRESHOLD = 15; //spawning on top or bottom side of screen is possible only if speed on y axis higher than this THRESHOLD

type Line = {
    startX:number;
    startY:number;
    endX:number;
    endY:number;

    //for moving sprite outside screen
    boundryX:number;
    boundryY:number;
}
export class ObjectsSpawner
{
    app:Application; 
  //  screenRect:SpriteObject;
    parent:Container;

    //for motion tracking
    cam: CameraHandler; 
    lastX: number; 
    lastY: number;

    ticker!:Ticker;
    timeCount:number;

    minTime:number= .1;
    maxTime:number= 4;

    top:Line;
    bottom:Line;
    left:Line;
    right:Line;

    monitor!:ObjectsLifeMonitor
    pools!: PoolsController;

    constructor(app : Application, cam:CameraHandler, parent:Container)
    {   
        this.init();

        this.app = app;
        this.cam = cam;
        this.parent = parent;
   //     this.objectType = objectType;
        this.lastX = cam.position.x;
        this.lastY = cam.position.y;
        
        this.top = {startX:0,startY:0, endX:app.screen.width, endY:0, boundryX:0, boundryY:-1};
        this.bottom = {startX:0, startY:app.screen.height, endX:app.screen.width,endY:app.screen.height, boundryX:0, boundryY:1};
        this.left = {startX:0, startY:0, endX:0, endY:app.screen.height, boundryX:-1, boundryY:0};
        this.right = {startX:app.screen.width, startY:0, endX:app.screen.width, endY:app.screen.height, boundryX:1, boundryY:-1};

    //    this.screenRect = new SpriteObject(app.screen.width/5,app.screen.height/5, Texture.from("assets/ground.png"));
    //    this.app.stage.addChild(this.screenRect);
      //  this.screenRect.anchor.set(0.5, 0.5);
     //   this.screenRect.position.set(app.screen.width / 2,app.screen.height / 2);

        this.timeCount=2;
    }
    async init()
    {
        const cloudTex : Texture = await Assets.load("assets/cloud1.png"); 
        const cloudSprite = new SpriteObject(200, 125, cloudTex);
        const cloudPool = new SpriteObjectPool(cloudSprite.realWidth, cloudSprite.realHeight, cloudTex);

        this.pools = new PoolsController();
        this.pools.addPool("cloud", cloudPool);

        this.monitor = new ObjectsLifeMonitor(1,500, this.pools);

        this.ticker = new Ticker();
        this.ticker.maxFPS = 30;
        this.ticker.add(this.randomGeneration, this);
        this.ticker.start();

    }
    async randomGeneration()
    {
        //velocity, it should influence objects generation frequency and position 
        const camX = this.cam.x - this.lastX;
        const camY = this.cam.y - this.lastY;
        
        const speed = Math.sqrt(camX*camX +camY*camY);

        this.timeCount -= speed/200 + this.ticker.elapsedMS/1000;
        
        if(this.timeCount <= 0)
        {
            const spawnSide:Line[] = [];
            let toPush : Line;
            if(Math.abs(camY) > VERTICAL_THRESHOLD)
            {
                if(camY > VERTICAL_THRESHOLD)
                    toPush = this.top;
                else
                    toPush = this.bottom;

                
                for(let i = 0;i<Math.abs(camY)/VERTICAL_THRESHOLD;i++)
                    spawnSide.push(toPush);
            }

            if(Math.abs(camX) > HORIZONTAL_THRESHOLD)
            {
                if(camX > HORIZONTAL_THRESHOLD)
                    toPush = this.left;
                else
                    toPush = this.right;

                for(let i = 0;i<Math.abs(camX) / HORIZONTAL_THRESHOLD;i++)
                    spawnSide.push(toPush);

            }
            else spawnSide.push(this.left, this.right);

            const ranIdx = Math.floor( Math.random() * spawnSide.length);

            const ranPosX = lerp(spawnSide[ranIdx].startX, spawnSide[ranIdx].endX, Math.random());
            const ranPosY = lerp(spawnSide[ranIdx].startY, spawnSide[ranIdx].endY, Math.random());

            const cloudSprite = new GameObject({x:6*(Math.random()-0.5), y:0}, this.pools.getASprite("cloud"));
            
            this.parent.addChild(cloudSprite.sprite);
                        
            const local = new Point(ranPosX, ranPosY);
            const global = this.cam.viewRect.toGlobal(local);
            const world = this.cam.toLocal(global);            
            
            cloudSprite.setPosition(world.x, world.y);

            
            cloudSprite.x += spawnSide[ranIdx].boundryX * cloudSprite.sprite.realWidth / 2; 
            cloudSprite.y += spawnSide[ranIdx].boundryY * cloudSprite.sprite.realHeight / 2;
            cloudSprite.sprite.alpha = .7;
            this.monitor.addActiveObject(cloudSprite);
            this.timeCount = this.minTime + Math.random() * (this.maxTime - this.minTime);
        }

        this.lastX = this.cam.x;
        this.lastY = this.cam.y;
    }   
}

class ObjectsLifeMonitor
{
    sleepMap:Map<GameObject, number>; // value of map represent value of timeCount when the object was added to map (when it goes outside of screen view and lod is disabling its sprite) 
    activeList:GameObject[];
    ticker:Ticker;

    timeCount: number // number of seconds passed from when ticker has started counting, each time a new object is mapped, it should be assigned as value thims variable
    sleepMaxTime:number;
    activeMaxDistance:number;
    pools:PoolsController;
//    despawner: ObjectsDespawner;
    constructor(sleepMaxTime:number, activeMaxDistance:number, pools:PoolsController)//, despawner: ObjectsDespawner)
    {
        this.pools = pools;
        this.sleepMap = new Map<GameObject, number>;
        this.timeCount = 0;
        this.sleepMaxTime = sleepMaxTime;
        this.activeList = []
        this.activeMaxDistance = activeMaxDistance;
        this.ticker = new Ticker();
        this.ticker.add(this.activeMonitor, this);
        this.ticker.maxFPS = 2;
        this.ticker.start();
    } 

    activeMonitor()
    {
        this.timeCount+=this.ticker.elapsedMS/1000;
      
        const playerPos = Physics.shared.player;
        for(let i=0;i<this.activeList.length;i++)
        {
            if(this.activeList[i].isActive) 
            {
                if(Math.abs(this.activeList[i].position.x - playerPos.x) > this.activeMaxDistance ||
                   Math.abs(this.activeList[i].position.y - playerPos.y) > this.activeMaxDistance)
                {
                    this.activeList[i].setState(false);
                    this.sleepMap.set(this.activeList[i], this.timeCount);
                }
            }
            else 
            {
                const objTime = this.sleepMap.get(this.activeList[i]);
                if(objTime !== undefined)
                {
                    if(this.sleepMaxTime < this.timeCount - objTime) 
                    {
                        this.sleepMap.delete(this.activeList[i]);
                        this.pools.retrieve(this.activeList[i].sprite);
                        this.activeList[i].destroy();
                        this.activeList.splice(i, 1);
                    }
                    else
                    {
                        if(Math.abs(this.activeList[i].position.x - playerPos.x) < this.activeMaxDistance &&
                        Math.abs(this.activeList[i].position.y - playerPos.y) < this.activeMaxDistance)
                        {
                            this.sleepMap.delete(this.activeList[i]);
                            this.activeList[i].setState(true);
                        }
                    }
                }
               else console.log("BUGUG: OBIECTUL NU-I IN MAPS!!!");

            }
        } 
        
    }

    addActiveObject(object:GameObject)
    {
        this.activeList.push(object);
    }
   
    addSleepObject(object:GameObject)
    {
        this.sleepMap.set(object, this.timeCount);
    }
}

type Pair<Type1, Type2> =
{
    object:Type1;
    state:Type2;
}
class SpriteObjectPool
{
    pool:Pair<SpriteObject,boolean>[];
    
    //object blueprint
    width:number;
    height:number;

    texture:Texture;

    constructor(width:number, height:number, texture:Texture)
    {
        this.width = width;
        this.height = height;
        this.texture = texture;

        this.pool=[];
    }

    get() : SpriteObject
    {
        for(let idx = 0; idx < this.pool.length; idx++)
        {
            if(this.pool[idx].state === true)
            {
                this.pool[idx].state = false;
                this.pool[idx].object.visible = true;
                return this.pool[idx].object;
            }
        }
        return this.create();
    }

    retrieve(obj : SpriteObject)
    {
        for(let idx = 0; idx < this.pool.length; idx++)
        {
            if(this.pool[idx].object === obj)
            {   
                this.pool[idx].object.visible = false;
                this.pool[idx].state = true;
                return;
            }
        }
    }

    private create() : SpriteObject
    {
        const obj = new SpriteObject(this.width, this.height, this.texture);
        this.pool.push({object:obj, state:false});
        return obj;
    }
}

class PoolsController //for different texture kinds
{
    pools:Map<string, SpriteObjectPool>; //string is the name of sprite created by its specific pool(eg cloud, plane, alien) 

    constructor()
    {
        this.pools = new Map();       
    }

    addPool(spriteName:string, pool: SpriteObjectPool)
    {
        this.pools.set(spriteName, pool);
    }

    getASprite(spriteName:string) : SpriteObject
    {
        return this.pools.get(spriteName)!.get();
    }
    retrieve(sprite:SpriteObject)
    {
        this.pools.forEach((pool) => {
            pool.retrieve(sprite);
        });
    }
}