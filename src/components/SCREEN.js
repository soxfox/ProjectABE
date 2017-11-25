class SCREEN {
    static "@inject" = {
	pool:"pool"
    }
    
    constructor( DOM ){
	
	let canvas = this.canvas = DOM.screen;
	if( !canvas ) throw "No canvas in Arduboy element";

	this.pool.add(this);
	
	canvas.width = 128;
	canvas.height = 64;

	this.ctx = canvas.getContext("2d");
        this.ctx.imageSmoothingEnabled = false;
	this.ctx.msImageSmoothingEnabled = false;

	this.fb = this.createBuffer();
	this.fbON = this.createBuffer();
	this.fbOFF = this.createBuffer();
	this.activeBuffer = this.fbON;
	this.dirty = true;

	this.fbON.data.fill(0xFF);

	DOM.element.controller = this;
	DOM.element.dispatchEvent( new Event("addperiferal", {bubbles:true}) );
	
	this.sck.connect = DOM.element.getAttribute("pin-sck");
	this.sda.connect = DOM.element.getAttribute("pin-sda");
	this.res.connect = DOM.element.getAttribute("pin-res");
	this.dc.connect = DOM.element.getAttribute("pin-dc");


	this.reset();
	
    }

    setActiveView(){
	this.pool.remove(this);
    }

    onPressKeyF(){
	var docEl = this.canvas; // doc.documentElement;
	
	toggleFullScreen();

	return;

	function isFullScreen(){
		var doc = window.document;
		return doc.fullscreenElement || doc.mozFullScreenElement || doc.webkitFullscreenElement || doc.msFullscreenElement || false;
	}

	function toggleFullScreen(toggle) {
		var doc = window.document;
	        

		var requestFullScreen = docEl.requestFullscreen || docEl.mozRequestFullScreen || docEl.webkitRequestFullScreen || docEl.msRequestFullscreen;
		var cancelFullScreen = doc.exitFullscreen || doc.mozCancelFullScreen || doc.webkitExitFullscreen || doc.msExitFullscreen;
		var state = isFullScreen();

		if( toggle == undefined ) toggle = !state;
		else if( toggle == state ) return;

		if( toggle ) requestFullScreen.call(docEl);
		else cancelFullScreen.call(doc);
	}
    }
    
    
    tick(){
	if( this.dirty ){
	    this.ctx.putImageData( this.activeBuffer, 0, 0 );
	    this.dirty = false;
	}
    }

    createBuffer(){
	let canvas = this.canvas;
	try{
            return new ImageData(
		new Uint8ClampedArray(canvas.width*canvas.height*4),
		canvas.width,
		canvas.height
	    );
	}catch(e){
	    return this.ctx.createImageData(canvas.width, canvas.height);
	}
	
    }

    reset(){
	this.mode = 0;
	this.clockDivisor = 0x80;
	this.cmd = [];
	this.pos = 0;
	this.fb.data.fill(0);
	this.colStart = 0;
	this.colEnd = 128;
	this.pageStart = 0;
	this.pageEnd = 8;
    }

    state = function( data ){
	// console.log( "DATA: " + data.toString(16) );
	let cs = this.colStart;
	let ce = this.colEnd;
	let cd = ce - cs;
	let ps = this.pageStart;
	let pe = this.pageEnd;
	let pd = pe - ps;
	
	let p = this.pos++;
	let x = cs + p % cd;
	let y = (ps + (p / cd)|0) * 8;
	for( let i=0; i<8; ++i ){
	    let offset = ((y+i)*128 + x) * 4;
	    let bit = ((data >>> i) & 1) * 0xE0;
	    this.fb.data[ offset++ ] = bit;
	    this.fb.data[ offset++ ] = bit;
	    this.fb.data[ offset++ ] = bit;
	    this.fb.data[ offset++ ] = bit;
	}

	if( this.pos >= pd*cd )
	    this.pos = 0;

	this.dirty = true;
		 
    }

    sck = {
	connect:null
    }

    sda = {
	connect:null,
	MOSI:function( data ){

	    if( this.mode == 0 ){ // data is a command
		let cmd = "cmd" + data.toString(16).toUpperCase();
		if( this.cmd.length ){
		    this.cmd.push( data );
		    cmd = this.cmd[0];
		}else this.cmd.push( cmd );

		let fnc = this[cmd];
		
		if( !fnc )
		    return console.warn("Unknown SSD1306 command: " + cmd.toString(16));
		
		if( fnc.length == this.cmd.length-1 ){
		    this.cmd.shift();
		    this[cmd].apply( this, this.cmd );
		    this.cmd.length = 0;
		}

	    }else{
		this.state( data );
	    }
	}
    }

    res = {
	connect:null,
	onLowToHigh:function(){
	    this.reset();
	}
    }

    dc = {
	connect:null,
	onLowToHigh:function(){
	    this.mode = 1; // data
	},
	onHighToLow:function(){
	    this.mode = 0; // command
	} 
    }

    // Set Lower Column Start Address for
    // Page Addressing Mode 
    cmd0(){
    }
    cmd1(){
    }
    cmd2(){
    }// etc
    cmdF(){
    }



    // Display Off
    cmdAE(){
	this.activeBuffer = this.fbOFF;
    }

    // Set Display Clock Divisor v = 0xF0
    cmdD5( v ){
	this.clockDivisor = v;
    }

    // Charge Pump Setting v = enable (0x14)
    cmd8D( v ){
	this.chargePumpEnabled = v;
    }

    // Set Segment Re-map (A0) | (b0001)
    cmdA0(){ this.segmentRemap = 0 };
    cmdA1(){ this.segmentRemap = 1 };

    cmdA5(){  }; // multiplex something or other

    // Set COM Output Scan Direction
    cmdC8(){
    }

  // Set COM Pins v
    cmdDA( v ){
    }

  // Set Contrast v = 0xCF
    cmd81( v ){
    }

  // Set Precharge = 0xF1
    cmdD9( v ){
    }

  // Set VCom Detect
    cmdDB( v ){
    }

  // Entire Display ON
    cmdA4( v ){
	this.activeBuffer = v ? this.fbON : this.fb;
    }
    
  // Set normal/inverse display
    cmdA6( v ){
    }
    
  // Display On
    cmdAF( v ){
	this.activeBuffer = this.fb;
    }

  // set display mode = horizontal addressing mode (0x00)
    cmd20( v ){
    }

  // set col address range
    cmd21( v, e ){
	this.colStart = v;
	this.colEnd   = e+1;
    }

  // set page address range
    cmd22( v, e ){
	this.pageStart = v;
	this.pageEnd   = e+1;
	this.pos = 0;
    }
}

module.exports = SCREEN;