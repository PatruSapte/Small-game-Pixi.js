
import {Sprite, Texture, Application, Container, FederatedPointerEvent, FederatedWheelEvent, Point, Ticker, Rectangle, Graphics } from "pixi.js";
import {lerpColor} from "./Utils.ts";
import { Physics } from "./GameObject.ts";

const LOW_COLOR = 0xb5e2ff;
const HIGH_COLOR = 0x1e4b8f;
const MAX_ALTITUDE = 2000;

export class CameraBackground extends Sprite  {
    altitude : number;
    
    constructor(texture:Texture, screen : Rectangle)
    {
        super(texture);

        const heightFactor = screen.height / this.height;
        const widthFactor = screen.width / this.width;
        this.scale.set(widthFactor, heightFactor);

        this.angle = 180;
        this.anchor.set(1, 0);
        this.position.y = screen.y + screen.height;

        this.altitude = 0;
        this.update();
    }
    
    public setAltitude(cameraY: number)
    {
        const newAltitude = cameraY
        if(newAltitude > MAX_ALTITUDE)
            this.altitude = MAX_ALTITUDE;
        else 
            this.altitude = newAltitude;
        this.update();
    }
    public update(): void {
        this.tint = lerpColor(LOW_COLOR,HIGH_COLOR, this.altitude / MAX_ALTITUDE);
    }
}


export class CameraHandler extends Container
{
  moveLoop:Ticker;
  pointerGlobal = new Point();
  isPointerDown = false;
  app: Application;
  background:  CameraBackground;
  
  viewRect: Graphics; //basically the world space currently on rendered on canvas; it should not dependent on scale of CameraHandler(for better debug  nd development) 

  constructor(app: Application, backgroundTexture: Texture)
  {
    super();
    this.background = new CameraBackground(backgroundTexture, app.screen);
    this.app = app;
    this.app.stage.addChild(this.background);
    this.app.stage.addChild(this);
   
    this.viewRect = new Graphics();
    this.app.stage.addChild(this.viewRect);
    const initialCameraRect = this.getCameraWorldRect();

    this.viewRect.clear();
    this.viewRect.lineStyle(5, 0xff0000);
    this.viewRect.drawRect(
        0,
        0,
        initialCameraRect.width,
        initialCameraRect.height
    );

    // Position at top-left of the screen
    this.viewRect.position.set(0, 0);
    
    this.app.stage.eventMode = 'static';
    this.app.stage.on('wheel', this.onCameraZoom, this);
   
    this.moveLoop = new Ticker();
    this.moveLoop.add(this.cameraMover, this);
    this.moveLoop.stop();


    this.app.stage.on('pointermove', this.onPointerMove, this);
    this.app.stage.on('pointerdown', this.onPointerDown, this);
    this.app.stage.on('pointerup', this.onPointerUp, this);
    this.app.stage.on('pointerupoutside', this.onPointerUp, this);

  }

  onPointerMove(e: FederatedPointerEvent)
  {
    this.pointerGlobal.copyFrom(e.global);
  }

  onPointerDown(e: FederatedPointerEvent)
  {
    this.isPointerDown = true;
    this.pointerGlobal.copyFrom(e.global);
    this.moveLoop.start();
  }

  onPointerUp()
  {
    this.isPointerDown = false;
    this.moveLoop.stop();
  }

  cameraMover(delta: number)
  {
    if (!this.isPointerDown) return;


    const screenCenterX = this.app.screen.width * 0.5;
    const screenCenterY = this.app.screen.height * 0.5;

    // Direction: center → pointer
    const dx = this.pointerGlobal.x - screenCenterX;
    const dy = this.pointerGlobal.y - screenCenterY;

    const length = Math.hypot(dx, dy);
    if (length < 1) return;

    const dirX = dx / length;
    const dirY = dy / length;

    const SPEED = 10;

    this.x -= dirX * SPEED * delta;
    this.y -= dirY * SPEED * delta;

    Physics.shared.player = this.toLocal({x:screenCenterX,y:screenCenterY});; //need to be removed after implementing player

    this.updateAltitude(); 
  }

  onCameraZoom(event: FederatedWheelEvent)
  {
    
    const zoomFactor = 1 - event.deltaY * 0.001;

    // Clamp zoom
    const newScale = Math.max(0.01, this.scale.x * zoomFactor);

    // 1. Pointer position in world space BEFORE zoom
    const worldPosBefore = this.toLocal(event.global);

    // 2. Apply zoom
    this.scale.set(newScale);
  
    // 3. Pointer position in world space AFTER zoom
    const worldPosAfter = this.toLocal(event.global);

    // 4. Move camera by the difference
    this.x += (worldPosAfter.x - worldPosBefore.x) * this.scale.x;
    this.y += (worldPosAfter.y - worldPosBefore.y) * this.scale.y;

    Physics.shared.player = this.position; //need to be removed after implementing player
    this.updateViewRect();
    this.updateAltitude();
  }
  updateViewRect()
  {
    this.viewRect.scale = this.scale;

    this.viewRect.position.set(
        (this.app.screen.width  - this.app.screen.width  * this.scale.x) * 0.5,
        (this.app.screen.height - this.app.screen.height * this.scale.y) * 0.5
    );
  }
  updateAltitude()
  {
    const screenCenter = new Point(
    this.app.screen.width * 0.5,
    this.app.screen.height * 0.5
    );

    // World position under the screen center
    const worldCenter = this.toLocal(screenCenter);

    // Altitude = world Y at screen center
    this.background.setAltitude(-worldCenter.y);
  }

  getCameraWorldRect(): Rectangle
  {
    const topLeft = this.toLocal(new Point(0, 0));
    const bottomRight = this.toLocal(
        new Point(this.app.screen.width, this.app.screen.height)
    );

    return new Rectangle(
        topLeft.x,
        topLeft.y,
        bottomRight.x - topLeft.x,
        bottomRight.y - topLeft.y
    );
  }


}
