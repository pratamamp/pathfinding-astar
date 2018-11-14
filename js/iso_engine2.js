
var width = window.innerWidth;
var height = window.innerHeight;

var game = new Phaser.Game(width,height,Phaser.AUTO, 'isometric',null,false,true);
var levelData=
[[1,1,1,1,1,1,1,1,1,1,1,1,1,1],
[1,0,1,0,0,0,0,0,0,1,0,0,0,1],
[1,0,1,0,0,0,0,0,0,1,0,0,0,1],
[1,0,1,0,0,0,0,1,0,0,0,0,0,1],
[1,0,1,1,0,0,0,1,0,0,0,0,0,1],
[1,0,0,1,0,0,0,1,0,0,0,0,0,1],
[1,0,1,0,0,0,0,1,0,1,0,0,0,1],
[1,0,0,0,1,1,1,1,0,0,0,0,0,1],
[1,0,0,0,0,0,0,0,0,0,0,0,0,1],
[1,0,0,0,0,0,0,0,1,1,0,0,0,1],
[1,1,0,0,1,1,0,1,0,0,0,0,0,1],
[1,0,0,0,1,1,0,0,0,0,1,1,0,1],
[1,0,0,0,0,0,0,1,1,0,0,0,0,1],
[1,0,0,0,0,0,1,1,0,0,0,0,0,1],
[1,1,1,1,1,1,1,1,1,1,1,1,1,1]];

//x & y values of the direction vector for character movement
var dX=0;
var dY=0;
var tileWidth=50;// the width of a tile
var borderOffset = new Phaser.Point(width/2,10);//to centralise the isometric level display
var wallGraphicHeight=98;
var floorGraphicWidth=103;
var floorGraphicHeight=53;
var heroGraphicWidth=41;
var heroGraphicHeight=62;
var wallHeight=wallGraphicHeight-floorGraphicHeight; 
var heroHeight=(floorGraphicHeight/2)+(heroGraphicHeight-floorGraphicHeight)+6;//adjustments to make the legs hit the middle of the tile for initial load
var heroWidth= (floorGraphicWidth/2)-(heroGraphicWidth/2);//for placing hero at the middle of the tile
var facing='south';
var sorcerer;//hero
var sorcererShadow;//duh
var shadowOffset=new Phaser.Point(heroWidth+7,11);
var bmpText;//title text
var normText;//text to display hero coordinates
var minimap;//minimap holder group
var heroMapSprite;//hero marker sprite in the minimap
var gameScene;//this is the render texture onto which we draw depth sorted scene
var floorSprite;
var wallSprite;
var heroMapTile=new Phaser.Point(3,3);//hero tile values in array
var heroMapPos;//2D coordinates of hero map marker sprite in minimap, assume this is mid point of graphic
var heroSpeed=1.2;//well, speed of our hero 
var hero2DVolume = new Phaser.Point(30,30);//now that we dont have a minimap & hero map sprite, we need this
var tapPos=new Phaser.Point(0,0);
var easystar;
var isFindingPath=false;
var path=[];
var destination=heroMapTile;
var stepTillTurn=19;//20 works best but thats for full frame rate
var stepsTaken=0;
var isWalking;
var halfSpeed=0.9;//changed from 0.5 for smooth diagonal walks
var cornerMapPos=new Phaser.Point(0,0);
var cornerMapTile=new Phaser.Point(0,0);
var visibleTiles=new Phaser.Point(6,6);

var BasicGame = function (game){ };
BasicGame.Boot = function(game) { };

BasicGame.Boot.prototype = {
    preload:function (){
        var randomTime = Math.floor(Math.random() * new Date().getTime());
        //console.log(randomTime);
        game.load.crossOrigin='Anonymous';
        // game.load.bitmapFont('font', 'assets/font.png?r=randomTime', 'assets/font.xml?r=randomTime');
        game.load.image('greenTile', 'assets/green_tile.png?r=randomTime');
        game.load.image('redTile', 'assets/red_tile.png?r=randomTime');
        game.load.image('heroTile', 'assets/hero_tile.png?r=randomTime');
        game.load.image('heroShadow', 'assets/ball_shadow.png?r=randomTime');
        game.load.image('floor', 'assets/floor.png?r=randomTime');
        game.load.image('wall', 'assets/block.png?r=randomTime');
        // game.load.image('door', 'assets/door.png?r=randomTime');
        game.load.image('ball', 'assets/ball.png?r=randomTime');
        game.load.image('pickup', 'assets/pickup.png?r=randomTime');

        game.load.atlasJSONArray('hero', 'assets/hero_8_4_41_62.png?r=randomTime', 'assets/hero_8_4_41_62.json?r=randomTime');
    },

    create:function(){
        //bmpText = game.add.bitmapText(10, 10, 'font', 'PathFinding\nTap Green Tile', 18);
        //normText=game.add.text(10,360,"hi");
        game.stage.backgroundColor = '#cccccc';
        //we draw the depth sorted scene into this render texture
        gameScene=game.add.renderTexture(game.width,game.height);
        game.add.sprite(0, 0, gameScene);
        floorSprite= game.make.sprite(0, 0, 'floor');
        wallSprite= game.make.sprite(0, 0, 'wall');
        sorcererShadow=game.make.sprite(0,0,'heroShadow');
        sorcererShadow.scale= new Phaser.Point(0.5,0.6);
        sorcererShadow.alpha=0.4;
        isWalking=false;
        createLevel();
        
        easystar = new EasyStar.js();
        easystar.setGrid(levelData);
        easystar.setAcceptableTiles([0]);
        easystar.enableDiagonals();// we want path to have diagonals
        easystar.disableCornerCutting();// no diagonal path when walking at wall corners
        
        game.input.activePointer.leftButton.onUp.add(findPath)
        
    },

    update:function(){
        airwalk();
        //if no key is pressed then stop else play walking animation
        if (dY == 0 && dX == 0)
        {
            sorcerer.animations.stop();
            sorcerer.animations.currentAnim.frame=0;
        }else{
            if(sorcerer.animations.currentAnim!=facing){
                sorcerer.animations.play(facing);
            }
        }
        
        cornerMapPos.x -=  heroSpeed * dX;
        cornerMapPos.y -=  heroSpeed * dY;
        cornerMapTile=getTileCoordinates(cornerMapPos,tileWidth);

        heroMapPos.x +=  heroSpeed * dX;
        heroMapPos.y +=  heroSpeed * dY;
        heroMapSprite.x=heroMapPos.x-heroMapSprite.width/2;
        heroMapSprite.y=heroMapPos.y-heroMapSprite.height/2;
        //get the new hero map tile
        heroMapTile=getTileCoordinates(heroMapPos,tileWidth);
        //depthsort & draw new scene
        renderScene();
    }
        

};


function createLevel(){//create minimap
    minimap= game.add.group();
    var tileType=0;
    for (var i = 0; i < levelData.length; i++)
    {
        for (var j = 0; j < levelData[0].length; j++)
        {
            tileType=levelData[i][j];
            placeTile(tileType,i,j);
            if(tileType==2){//hero map tile
               heroMapTile=new Phaser.Point(i,j);
            }
        }
    }
    addHero();
    heroMapSprite=minimap.create(heroMapTile.y * tileWidth, heroMapTile.x * tileWidth, 'heroTile');
    heroMapSprite.x+=(tileWidth/2)-(heroMapSprite.width/2);
    heroMapSprite.y+=(tileWidth/2)-(heroMapSprite.height/2);
    heroMapPos=new Phaser.Point(heroMapSprite.x+heroMapSprite.width/2,heroMapSprite.y+heroMapSprite.height/2);
    heroMapTile=getTileCoordinates(heroMapPos,tileWidth);
    minimap.scale= new Phaser.Point(0.3,0.3);
    minimap.x=10;
    minimap.y=3;
    renderScene();
}

function addHero(){
    // sprite
    sorcerer = game.add.sprite(-50, 0, 'hero', '1.png');// keep him out side screen area
   
    // animation
    sorcerer.animations.add('southeast', ['1.png','2.png','3.png','4.png'], 6, true);
    sorcerer.animations.add('south', ['5.png','6.png','7.png','8.png'], 6, true);
    sorcerer.animations.add('southwest', ['9.png','10.png','11.png','12.png'], 6, true);
    sorcerer.animations.add('west', ['13.png','14.png','15.png','16.png'], 6, true);
    sorcerer.animations.add('northwest', ['17.png','18.png','19.png','20.png'], 6, true);
    sorcerer.animations.add('north', ['21.png','22.png','23.png','24.png'], 6, true);
    sorcerer.animations.add('northeast', ['25.png','26.png','27.png','28.png'], 6, true);
    sorcerer.animations.add('east', ['29.png','30.png','31.png','32.png'], 6, true);
}

function renderScene(){
    gameScene.clear();//clear the previous frame then draw again
    var tileType=0;

    //console.log("startTile= "+startTileX+" , "+startTileY);
    //console.log("cornermappos= "+cornerMapPos);
    for (var i = 0; i < levelData.length; i++)
    {
        for (var j = 0; j < levelData[0].length; j++)
        {
            tileType=levelData[i][j];
            drawTileIso(tileType,i,j);
            if(i==heroMapTile.y&&j==heroMapTile.x){
                drawHeroIso();
            }
        }
    }
    //normText.text='Tap on x,y: '+tapPos.x +','+tapPos.y;
}

function changeVisibleTiles(){
    visibleTiles.x=Math.min(visibleTiles.x+1,levelData[0].length);
    visibleTiles.y=Math.min(visibleTiles.y+1,levelData.length);
    //normText.text='visible : '+visibleTiles.y +' x '+visibleTiles.x;
}

function drawHeroIso(){
    var isoPt= new Phaser.Point();//It is not advisable to create points in update loop
    var heroCornerPt=new Phaser.Point(heroMapPos.x-heroMapSprite.width/2,heroMapPos.y-heroMapSprite.height/2);
    //var heroCornerPt = new Phaser.Point(heroMapPos.x - heroMapSprite.x/2 + cornerMapPos.x , heroMapPos.y - heroMapSprite.y/2+cornerMapPos.y);
    
    isoPt=cartesianToIsometric(heroCornerPt);//find new isometric position for hero from 2D map position
    gameScene.renderXY(sorcererShadow,isoPt.x+borderOffset.x+shadowOffset.x, isoPt.y+borderOffset.y+shadowOffset.y, false);//draw shadow to render texture
    gameScene.renderXY(sorcerer,isoPt.x+borderOffset.x+heroWidth, isoPt.y+borderOffset.y-heroHeight, false);//draw hero to render texture
}

function drawTileIso(tileType,i,j){//place isometric level tiles
    var isoPt= new Phaser.Point();//It is not advisable to create point in update loop
    var cartPt=new Phaser.Point();//This is here for better code readability.
    cartPt.x=j*tileWidth;
    cartPt.y=i*tileWidth;
    isoPt=cartesianToIsometric(cartPt);
    if(tileType==1){
        gameScene.renderXY(wallSprite, isoPt.x+borderOffset.x, isoPt.y+borderOffset.y-wallHeight, false);
    }else{
        gameScene.renderXY(floorSprite, isoPt.x+borderOffset.x, isoPt.y+borderOffset.y, false);
    }
}

function placeTile(tileType, i,j){
    var tile='greenTile';
    if(tileType==1){
        tile='redTile';
    }
    var tmpSpr=minimap.create(j * tileWidth, i * tileWidth, tile);
    tmpSpr.name="tile"+i+"_"+j;
}

function findPath(){
    if(isFindingPath || isWalking)return;
    var pos=game.input.activePointer.position;
    var isoPt= new Phaser.Point(pos.x-borderOffset.x,pos.y-borderOffset.y); 
    tapPos=isometricToCartesian(isoPt);
    tapPos.x-=tileWidth/2;//adjustment to find the right tile for error due to rounding off
    tapPos.y+=tileWidth/2;
    tapPos=getTileCoordinates(tapPos,tileWidth);
    //  console.log(tapPos);
   
    if(tapPos.x>-1&&tapPos.y>-1&&tapPos.x<levelData[0].length&&tapPos.y<levelData.length){//tapped within grid
        if(levelData[tapPos.y][tapPos.x]!=1){//not wall tile
            isFindingPath=true;
            //let the algorithm do the magic
            easystar.findPath(heroMapTile.x, heroMapTile.y, tapPos.x, tapPos.y, plotAndMove);
            easystar.calculate();
        }
    }
}
function plotAndMove(newPath){
    destination=heroMapTile;
    path=newPath;
    isFindingPath=false;
    repaintMinimap();
    if (path === null) {
        console.log("No Path was found.");
    }else{
        path.push(tapPos);
        path.reverse();
        path.pop();
        for (var i = 0; i < path.length; i++)
        {
            var tmpSpr=minimap.getByName("tile"+path[i].y+"_"+path[i].x);
            tmpSpr.tint=0x0000ff;
            //console.log("p "+path[i].x+":"+path[i].y);
        }
        
    }
}

function plotAndMove(newPath){
    destination=heroMapTile;
    path=newPath;
    isFindingPath=false;
    repaintMinimap();
    if (path === null) {
        console.log("No Path was found.");
    }else{
        path.push(tapPos);
        path.reverse();
        path.pop();
        for (var i = 0; i < path.length; i++)
        {
            var tmpSpr=minimap.getByName("tile"+path[i].y+"_"+path[i].x);
            tmpSpr.tint=0x0000ff;
            //console.log("p "+path[i].x+":"+path[i].y);
        }
        
    }
    
}

function repaintMinimap(){
    for (var i = 0; i < levelData.length; i++)
    {
        for (var j = 0; j < levelData[0].length; j++)
        {
            var tmpSpr=minimap.getByName("tile"+i+"_"+j);
            tmpSpr.tint=0xffffff;
        }
    }
}

function airwalk(){
    if(path.length==0){//path has ended
        // console.log(destination.x+' , '+destination.y);
        // console.log(heroMapTile.x+' , '+heroMapTile.y);

        if(heroMapTile.x==destination.x&&heroMapTile.y==destination.y){
            dX=0;
            dY=0;
            //console.log("ret "+destination.x+" ; "+destination.y+"-"+heroMapTile.x+" ; "+heroMapTile.y);
            isWalking=false;
            //console.log(isFindingPath + '_' + isWalking);
            return;
        }
    }
    isWalking=true;
    if(heroMapTile.x==destination.x&&heroMapTile.y==destination.y){//reached current destination, set new, change direction
        //wait till we are few steps into the tile before we turn
        stepsTaken++;
        if(stepsTaken<stepTillTurn){
            return;
        }
        console.log("at "+heroMapTile.x+" ; "+heroMapTile.y);
        //centralise the hero on the tile    
        heroMapSprite.x=(heroMapTile.x * tileWidth)+(tileWidth/2)-(heroMapSprite.width/2);
        heroMapSprite.y=(heroMapTile.y * tileWidth)+(tileWidth/2)-(heroMapSprite.height/2);
        heroMapPos.x=heroMapSprite.x+heroMapSprite.width/2;
        heroMapPos.y=heroMapSprite.y+heroMapSprite.height/2;
        
        stepsTaken=0;
        destination=path.pop();//whats next tile in path
        if(heroMapTile.x<destination.x){
            dX = 1;
        }else if(heroMapTile.x>destination.x){
            dX = -1;
        }else {
            dX=0;
        }
        if(heroMapTile.y<destination.y){
            dY = 1;
        }else if(heroMapTile.y>destination.y){
            dY = -1;
        }else {
            dY=0;
        }
        if(heroMapTile.x==destination.x){//top or bottom
            dX=0;
        }else if(heroMapTile.y==destination.y){//left or right
            dY=0;
        }
        //figure out which direction to face
        if (dX==1)
        {
            if (dY == 0)
            {
                facing = "east";
            }
            else if (dY==1)
            {
                facing = "southeast";
                dX = dY=halfSpeed;
            }
            else
            {
                facing = "northeast";
                dX=halfSpeed;
                dY=-1*halfSpeed;
            }
        }
        else if (dX==-1)
        {
            dX = -1;
            if (dY == 0)
            {
                facing = "west";
            }
            else if (dY==1)
            {
                facing = "southwest";
                dY=halfSpeed;
                dX=-1*halfSpeed;
            }
            else
            {
                facing = "northwest";
                dX = dY=-1*halfSpeed;
            }
        }
        else
        {
            dX = 0;
            if (dY == 0)
            {
                //facing="west";
            }
            else if (dY==1)
            {
                facing = "south";
            }
            else
            {
                facing = "north";
            }
        }
    }
    //console.log(facing);
}

function isWalkable(){//It is not advisable to create points in update loop, but for code readability.
    var able=true;
    var heroCornerPt=new Phaser.Point(heroMapPos.x-hero2DVolume.x/2,heroMapPos.y-hero2DVolume.y/2);
    var cornerTL =new Phaser.Point();
    cornerTL.x=heroCornerPt.x +  (heroSpeed * dX);
    cornerTL.y=heroCornerPt.y +  (heroSpeed * dY);
    // now we have the top left corner point. we need to find all 4 corners based on the map marker graphics width & height
    //ideally we should just provide the hero a volume instead of using the graphics' width & height
    var cornerTR =new Phaser.Point();
    cornerTR.x=cornerTL.x+hero2DVolume.x;
    cornerTR.y=cornerTL.y;
    var cornerBR =new Phaser.Point();
    cornerBR.x=cornerTR.x;
    cornerBR.y=cornerTL.y+hero2DVolume.y;
    var cornerBL =new Phaser.Point();
    cornerBL.x=cornerTL.x;
    cornerBL.y=cornerBR.y;
    var newTileCorner1;
    var newTileCorner2;
    var newTileCorner3=heroMapPos;
    //let us get which 2 corners to check based on current facing, may be 3
    switch (facing){
        case "north":
            newTileCorner1=cornerTL;
            newTileCorner2=cornerTR;
        break;
        case "south":
            newTileCorner1=cornerBL;
            newTileCorner2=cornerBR;
        break;
        case "east":
            newTileCorner1=cornerBR;
            newTileCorner2=cornerTR;
        break;
        case "west":
            newTileCorner1=cornerTL;
            newTileCorner2=cornerBL;
        break;
        case "northeast":
            newTileCorner1=cornerTR;
            newTileCorner2=cornerBR;
            newTileCorner3=cornerTL;
        break;
        case "southeast":
            newTileCorner1=cornerTR;
            newTileCorner2=cornerBR;
            newTileCorner3=cornerBL;
        break;
        case "northwest":
            newTileCorner1=cornerTR;
            newTileCorner2=cornerBL;
            newTileCorner3=cornerTL;
        break;
        case "southwest":
            newTileCorner1=cornerTL;
            newTileCorner2=cornerBR;
            newTileCorner3=cornerBL;
        break;
    }
    //check if those corners fall inside a wall after moving
    newTileCorner1=getTileCoordinates(newTileCorner1,tileWidth);
    if(levelData[newTileCorner1.y][newTileCorner1.x]==1){
        able=false;
    }
    newTileCorner2=getTileCoordinates(newTileCorner2,tileWidth);
    if(levelData[newTileCorner2.y][newTileCorner2.x]==1){
        able=false;
    }
    newTileCorner3=getTileCoordinates(newTileCorner3,tileWidth);
    if(levelData[newTileCorner3.y][newTileCorner3.x]==1){
        able=false;
    }
    return able;
}

function detectKeyInput(){//assign direction for character & set x,y speed components
    if (upKey.isDown)
    {
        dY = -1;
    }
    else if (downKey.isDown)
    {
        dY = 1;
    }
    else
    {
        dY = 0;
    }
    if (rightKey.isDown)
    {
        dX = 1;
        if (dY == 0)
        {
            facing = "east";
        }
        else if (dY==1)
        {
            facing = "southeast";
            dX = dY=halfSpeed;
        }
        else
        {
            facing = "northeast";
            dX=halfSpeed;
            dY=-1*halfSpeed;
        }
    }
    else if (leftKey.isDown)
    {
        dX = -1;
        if (dY == 0)
        {
            facing = "west";
        }
        else if (dY==1)
        {
            facing = "southwest";
            dY=halfSpeed;
            dX=-1*halfSpeed;
        }
        else
        {
            facing = "northwest";
            dX = dY=-1*halfSpeed;
        }
    }
    else
    {
        dX = 0;
        if (dY == 0)
        {
            //facing="west";
        }
        else if (dY==1)
        {
            facing = "south";
        }
        else
        {
            facing = "north";
        }
    }
}

function cartesianToIsometric(cartPt){
    var tempPt=new Phaser.Point();
    tempPt.x=cartPt.x-cartPt.y;
    tempPt.y=(cartPt.x+cartPt.y)/2;
    return (tempPt);
}

function isometricToCartesian(isoPt){
    var tempPt=new Phaser.Point();
    tempPt.x=(2*isoPt.y+isoPt.x)/2;
    tempPt.y=(2*isoPt.y-isoPt.x)/2;
    return (tempPt);
}

function getTileCoordinates(cartPt, tileHeight){
    var tempPt=new Phaser.Point();
    tempPt.x=Math.floor(cartPt.x/tileHeight);
    tempPt.y=Math.floor(cartPt.y/tileHeight);
    return(tempPt);
}

function getCartesianFromTileCoordinates(tilePt, tileHeight){
    var tempPt=new Phaser.Point();
    tempPt.x=tilePt.x*tileHeight;
    tempPt.y=tilePt.y*tileHeight;
    return(tempPt);
}


game.state.add('Boot', BasicGame.Boot);
game.state.start('Boot');
