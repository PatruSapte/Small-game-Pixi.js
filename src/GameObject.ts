import {Sprite, Texture, Point,Ticker} from "pixi.js";

interface PhysicsBody
{
    position: { x: number; y: number };
    velocity: { x: number; y: number };
    radius?: number; 
    updatePhysics(dt: number): void;
}

export class Physics
{
    static shared:Physics = new Physics();
    ticker: Ticker;
    bodies: PhysicsBody[];
    player: {x:number,y:number};//need to be change to PhysicsBody type after creating a player;
    constructor()
    {
        this.bodies = [];
        this.ticker = new Ticker();
        this.ticker.add(this.step, this);
        this.ticker.start();        

        this.player = {x:0,y:0};
    }

    add(body: PhysicsBody) {
        this.bodies.push(body);
    }

    remove(body: PhysicsBody) {
        const i = this.bodies.indexOf(body);
        if (i !== -1) this.bodies.splice(i, 1);
    }

    step(dt: number) {
        for (const body of this.bodies) {
            body.updatePhysics(dt);
        }
    };
}

export class SpriteObject extends Sprite
{
    realWidth! : number;
    realHeight! : number;
    constructor(realWidth:number, realHeight:number,texture:Texture)
    {
        super(texture);
        this.anchor.set(0.5, 0.5);
        this.SetSize(realWidth, realHeight);
    }  
  
    public SetSize(realWidth:number, realHeight:number) 
    {
        this.realWidth = realWidth;
        this.realHeight = realHeight;

        const heightFactor = this.realHeight / this.height;
        const widthFactor = this.realWidth / this.width;
        this.scale.set(widthFactor, heightFactor);
    }
    
    override destroy(){
        super.destroy();
    }

 
}

type point = {x:number, y:number}

export class GameObject implements PhysicsBody
{
    isActive: boolean;
    private position_!: { x: number; y: number; };
    velocity : point;
    sprite!:SpriteObject;
    
    public get x() : number {
        return this.position.x;
    }
    public set x(v : number) {
        this.position.x = v;
        if(this.isActive)
            this.sprite.x = this.x;
    }
    public get y() : number {
        return this.position.y;
    }
    public set y(v : number) {
        this.position.y = v;
        if(this.isActive)
            this.sprite.y = this.y;
    }
    public set position(v:{x:number,y:number})
    {
        this.position_ = v;
        if(this.isActive)
            this.sprite.position = v;
    }
    public get position()
    {
        return this.position_;
    }
    constructor(velocity:point, spriteObject:SpriteObject)
    {
        this.sprite = spriteObject;
      
        this.velocity = velocity;
        this.isActive = true;
        this.position = {x:0,y:0};
        Physics.shared.add(this);
     //   this.ticker = new Ticker();
     //   this.ticker.add(this.update, this);
     //   this.ticker.start();
    }

    updatePhysics(dt:number) : void {
        this.addPosition( this.velocity.x * dt, this.velocity.y * dt);      
    }
  
    setPosition(x:number, y:number)
    {
        this.position.x = x;
        this.position.y = y;

        if(this.isActive)
            this.applyPositionToSprite();
    }
    addPosition(x:number, y:number)
    {
        this.position.x += x;
        this.position.y += y;

        if(this.isActive)
            this.applyPositionToSprite();
    }
    applyPositionToSprite()
    {
        this.sprite.position = this.position;
    }

    destroy()
    {
        Physics.shared.remove(this);
        
        // handled by object pool this.sprite.destroy();
    }
    
    setState(active:boolean)
    {
        if(this.isActive == active) return;
       
        if(active)
        {
        //    this.sprite =  undefined;
        }

        this.isActive = active;
    }

    public SetScreenRelativePosition(screenX:number, screenY:number)
    {
        const p:Point = new Point(screenX,screenY);
        this.position = this.sprite.toLocal(p);
        this.applyPositionToSprite();
    }
}