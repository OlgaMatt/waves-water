    /* Global variables */
    var gl = null; // webGL context
	var canvas;
	
    // locations (indices) of the attributes
    const posAttributeIndex = 0;
    const normAttributeIndex = 1;
	
    // locations of the uniform "mvp", "lightDir", etc
    var mvp_loc;
	var m_loc;
    var lightDir_loc;
	var dudvTexture_loc;
	var normalMap_loc;
	var lakemoraine_loc;
	var tiling_loc;
	var dudvOffsetX_loc;
	var dudvOffsetY_loc;
	var waterReflectivity_loc;
	var waterDistortionStrength_loc;
	var readPixels_loc;
	var time_loc;
	var timeA_loc;
	var pos_loc;
	var propa_loc;
    
    // meshes (in GPU)
    var plane = [];
	
	// other variables
	var tiles = 4.0;
	var dudvOffsetX = 0.0;
	var dudvOffsetY = 0.0;
	var waterReflectivity = 0.3;
	var waterDistortionStrength = 0.03;
	var cameraPos = [ 0.0, 0.0, -5.0 ];
	var normalmap = loadImage("normalmap.png");
	var dudvmap = loadImage("dudvmap.png");
	var lakemoraine = loadImage("lakemoraine.jpg");
	var ripplesMax = 5;
	var pos = [0.5,0.5,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0];
			   //0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,
			   //0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0];
	var timeA = [0.01,2000,2000,2000,2000];
	             //2000,2000,2000,2000,2000,
			     //2000,2000,2000,2000,2000];
	var propa = [0.01,2000,2000,2000,2000];
			     //2000,2000,2000,2000,2000,
			     //2000,2000,2000,2000,2000];
	pos = pos.slice(0,ripplesMax*2);
	timeA = timeA.slice(0,ripplesMax);
	propa = propa.slice(0,ripplesMax);
    var indexLi = 0;
	
	var images = [dudvmap, normalmap, lakemoraine];
	var readPixels = false;
    var lastMousePosX, lastMousePosY;
	var time = 0;
    
    var trackball = {
	   p0: [0, 0, 0],
	   p1: [0, 0.2, 0],
	   qcurr : [1, 0, 0, 0],
	   
	   getViewQuaternion: function() {
		   var res = identityMatrix();
		   var d = 500;
		   var r = 30;
		   
		   var o = [0, 0, -d];
		   var v = getAxis(this.p0,this.p1,o);
		   var alpha = getAlpha(this.p0,this.p1,r,d);
		   var m2 = translationMatrix( cameraPos[0], cameraPos[1], cameraPos[2] );
		   var qnew = AxisAngle2Quaternion(v, alpha);
		   
		   this.qcurr = multQuaternion(this.qcurr, qnew);
		   var m1 = Quaternion2Matrix(this.qcurr);
		   var m0 = translationMatrix( 0,-1.5, 0 );
		  
		   res = multMatrix( res, m2 );
		   res = multMatrix( res, m1 );
		   res = multMatrix( res, m0 );
		   return res;
	   }
    };
	
    /* Initialization */
    function setupWebGL() {
       canvas = document.getElementById("A-CANVAS");
	   canvas.onmousemove = myMouseMove;
	   canvas.onmousedown = myMouseDown;
	   canvas.onmouseup = myMouseUp;
       gl = canvas.getContext("experimental-webgl",{preserveDrawingBuffer: true}) || canvas.getContext("webgl",{preserveDrawingBuffer: true});  // or, "webgl"
    }

    function setupWhatToDraw() {  
    	// CpuMesh and GpuMesh defined in module mesh.js 
	   // unique CPU mesh buffer to transfer data to the GPU
       var unaMesh = Object.create( CpuMesh );
       
       // various GPU meshes used by the program
       plane = Object.create( GpuMesh );
       plane.init(gl);


       // create & transfer meshes
       unaMesh.makePlane(tiles);
       plane.storeFromCpu( gl, unaMesh );
   }
    
    function setupHowToDraw() {	 
        // set OpenGL parameters
        gl.disable( gl.CULL_FACE ); // back face culling
        gl.enable( gl.DEPTH_TEST );    
        // set the VERTEX SHADER
        var vsSource = document.getElementById("vertexShader").textContent;
        var vertexShader = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vertexShader, vsSource);
        gl.compileShader(vertexShader);			   
        // set the FRAGMENT SHADER
        var fsSource = document.getElementById("fragmentShader").textContent;
        var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fragmentShader, fsSource);
        gl.compileShader(fragmentShader);
        // join them in a "PROGRAM"
        var myProgram = gl.createProgram();
        gl.attachShader(myProgram, vertexShader);
        gl.attachShader(myProgram, fragmentShader);
        // tell webGL where to find attirbutes
        gl.bindAttribLocation( myProgram,  posAttributeIndex, "vertexPos" );
        gl.bindAttribLocation( myProgram,  normAttributeIndex, "normal" );
		var textures = [];
		  for (var ii = 0; ii < 3; ++ii) {
			var texture = gl.createTexture();
			gl.bindTexture(gl.TEXTURE_2D, texture);
		 
			// Set the parameters so we can render any size image.
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		 
			// Upload the image into the texture.
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, images[ii]);
		 
			// add the texture to the array of textures.
			textures.push(texture);
		}
		
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, textures[0]);
		gl.activeTexture(gl.TEXTURE1);
		gl.bindTexture(gl.TEXTURE_2D, textures[1]);
		gl.activeTexture(gl.TEXTURE2);
		gl.bindTexture(gl.TEXTURE_2D, textures[2]);
        gl.linkProgram(myProgram);
		

        // ask webGL where to put uniforms
        mvp_loc = gl.getUniformLocation( myProgram, "mvp" );
        m_loc = gl.getUniformLocation( myProgram, "m" );
        lightDir_loc = gl.getUniformLocation( myProgram, "lightDir" );
		dudvTexture_loc = gl.getUniformLocation( myProgram, "dudvTexture" );
		normalMap_loc = gl.getUniformLocation( myProgram, "normalMap" );
		lakemoraine_loc = gl.getUniformLocation( myProgram, "lakeMoraine" );
		cameraPos_loc = gl.getUniformLocation( myProgram, "cameraPos");
		tiling_loc = gl.getUniformLocation( myProgram, "tiling");
		dudvOffsetX_loc = gl.getUniformLocation( myProgram, "dudvOffsetX");
		dudvOffsetY_loc = gl.getUniformLocation( myProgram, "dudvOffsetY");
		waterReflectivity_loc = gl.getUniformLocation( myProgram, "waterReflectivity");
		waterDistortionStrength_loc = gl.getUniformLocation( myProgram, "waterDistortionStrength");
		readPixels_loc = gl.getUniformLocation( myProgram, "readPixels");
		time_loc = gl.getUniformLocation( myProgram, "time");
		timeA_loc = gl.getUniformLocation( myProgram, "timeA");
		pos_loc = gl.getUniformLocation( myProgram, "pos");
		propa_loc = gl.getUniformLocation( myProgram, "propa");
		
		gl.useProgram(myProgram);
    }
    
    
    /* Rendering */
    function setUniforms(){
        // part 1: set & upload transformation matrices:
        var view = trackball.getViewQuaternion();
        var aspectRatio = 900.0 / 480.0 ; // TODO: get canvas dims
        var projection = perspectiveMatrixFOV( 60, aspectRatio, 0.5, 50.0 );
        
        var mvp = multMatrix( view, model.top() );
        mvp = multMatrix( projection, mvp );
        
        gl.uniformMatrix4fv( mvp_loc, false, new Float32Array(mvp));
        gl.uniformMatrix4fv( m_loc, false, new Float32Array(model.top()));
            
        // part 2: set & upload light directions etc
        var lightDir = normVec([ -1.0,-1.0,0.5,0 ]);
        var viewDir = [ 0,0,1,0 ]; // eye space, for now
        var halfWay = [];

        var modelInv = invMatrix4(model.top());
        var viewInv = invMatrix4(view);
        
        // light dir: from world (or eye) space to object space
        // headLight: viewDir from eye space (to world)
        lightDir = multMatrixVec( viewInv, lightDir );
        lightDir = multMatrixVec( modelInv, lightDir );	 // L <- inv(V) * L
        lightDir = normVec(lightDir);

        // view dir: from eye space (always) to object
        viewDir = multMatrixVec( viewInv, viewDir );  
        viewDir = multMatrixVec( modelInv, viewDir ); 
        viewDir = normVec(viewDir);
        
        halfWay = [viewDir[0]+lightDir[0], 
                   viewDir[1]+lightDir[1], 
                   viewDir[2]+lightDir[2], 
                   0];
        halfWay= normVec(halfWay);
        
        gl.uniform3f( lightDir_loc, lightDir[0],lightDir[1],lightDir[2] );
		gl.uniform3f( cameraPos_loc, viewDir[0], viewDir[1], -5 );
		gl.uniform1f( tiling_loc, parseFloat(tiles));
		gl.uniform1f( dudvOffsetX_loc, dudvOffsetX);
		gl.uniform1f( dudvOffsetY_loc, dudvOffsetY);
		gl.uniform1f( waterReflectivity_loc, waterReflectivity);
		gl.uniform1f( waterDistortionStrength_loc, waterDistortionStrength);
		gl.uniform1f( time_loc, time);
		gl.uniform1i( dudvTexture_loc, 0);
		gl.uniform1i( normalMap_loc, 1);
		gl.uniform1i( lakemoraine_loc, 2);
		gl.uniform1i( readPixels_loc, readPixels);
		gl.uniform2fv( pos_loc, pos);
		gl.uniform1fv( timeA_loc, timeA);
		gl.uniform1fv( propa_loc, propa);
    }
    
// draw functions
    function drawPlane() { 
       // object on top
       // lower base:
       model.push();
	   setUniforms();
       plane.draw(gl);
       model.pop(); // back to Column space!   
    }
    
    // rendering: fill screen buffer
    function draw() { 
        
        gl.clearColor(0.5, 0.7, 0.9, 1.0);
        gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        
        model.init();
		model.translate(0,1.5,0);
        const N_COL = 1;
        for (var i=0; i<N_COL; i++ ) {
          model.push();
		  model.scale(2.5,2.5,2.5);
          drawPlane();
          model.pop();
        }
    }
    
    /* callbacks */
    function readTextFile(filename,myGpuMesh){  
        var rawFile = new XMLHttpRequest() || new ActiveXObject('MSXML2.XMLHTTP');
        rawFile.open("GET", filename, true);
        rawFile.onreadystatechange = function ()
        {
            if (rawFile.readyState === 4 && rawFile.status === 200)
            {
                var allText = rawFile.responseText;
                var myCpuMesh = Object.create( CpuMesh );
		        myCpuMesh.importOFFfromString( allText );
		        myCpuMesh.updateAABB();
                myCpuMesh.updateNormals();
                myCpuMesh.autocenterNormalize();
		        myGpuMesh.storeFromCpu(gl, myCpuMesh);
                draw();
            }
        }
        rawFile.send();
    }
	

    function myOnLoad() {
        setupWebGL();
        setupWhatToDraw();
        setupHowToDraw();
		animationLoop();
        //draw();
    }
    
	
	
    function myMouseDown( event ) {
        lastMousePosX = event.screenX;
        lastMousePosY = event.screenY;
		trackball.p0[0] = 2*event.screenX/900-1;
		trackball.p0[1] = 2*(480-event.screenY)/480-1;
		trackball.p0[2] = 0;
		
		trackball.p1[0] = 2*event.screenX/900-1;
		trackball.p1[1] = 2*(480-event.screenY)/480-1;
		trackball.p1[2] = 0;
		
		if (event.buttons==1) {
		
			var coords = getCoords();
			
			readPixels = true;
			draw();
			
			pixels = new Uint8Array(1*4); // RGBA values for each pixel
			gl.readPixels(coords[0], coords[1], 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
			
			readPixels = false;
			draw();
			
			if (pixels[1] == 0 && pixels[3] == 255) {
				if(timeA[indexLi]>10){
					pos[indexLi*2+0] = pixels[0]/255;
					pos[indexLi*2+1] = 1-pixels[2]/255;
					timeA[indexLi] = 0.01;
					propa[indexLi] = 0.01;
					indexLi++;
					if(indexLi === ripplesMax){
						indexLi = 0;
					}
				}
			}
		
		}
		
    }

    function myMouseMove( event ) {
        if (event.buttons==0) return;

        var dx = event.screenX - lastMousePosX;
        var dy = event.screenY - lastMousePosY;
        lastMousePosX = event.screenX;
        lastMousePosY = event.screenY;
		
        if (event.buttons==1) { // left button is held down
			trackball.p1[0] = 2*event.screenX/900-1;
			trackball.p1[1] = 2*(480-event.screenY)/480-1;
			trackball.p1[2] = 0;
	
        }
        if (event.buttons==4) {
			cameraPos[2] *= 1.0-dy*0.01;
        }
    }
	 
    function myMouseUp( event ) {  
		trackball.p0 = [0,0,0]; 
		trackball.p1 = [0,0,0];
	}
	
	window.requestAnimationFrame = (function() {
		return  window.requestAnimationFrame || 
				window.webkitRequestAnimationFrame ||  
				window.mozRequestAnimationFrame || 
				window.oRequestAnimationFrame || 
				window.msRequestAnimationFrame ||
    
    // if none of the above, use non-native timeout method
	function(callback) {
		  window.setTimeout(callback, 1000 / 60);
		};
	})();
	
	var ix = 0;
	var iy = 0;
	function animationLoop(){
		for (var i = 0; i < ripplesMax; i++) {
			if(timeA[i]<2000){
				timeA[i] += 0.2+(timeA[i]/150); 
				propa[i] += 0.02;
			}
		}
		
		time++;
	    // feedback loop requests new frame
	    requestAnimationFrame( animationLoop );
	    // render function is defined below
	    ix += 1;
		iy += 1;
	    if (ix == 50) {
		    trackball.p1 = [0, 0, 0];
	    }
	    if (ix >= factorX) {
			ix == 0;
	    }
		
	    if (iy >= factorY) {
			iy == 0;
	    }
	    dudvOffsetX = (1/factorX)*(ix%factorX);
	    dudvOffsetY = (1/factorY)*(iy%factorY);
		
	    draw();
		
	}
	
	var factorX = 4100;
	var factorY = -4100;
	
	//Slider
	function updateSlider(slideAmount,slideId)
	{
		var sliderDiv = document.getElementById(slideId + "Value");
				
		switch(slideId) {
			case "wds":
				sliderDiv.innerHTML = (slideAmount/1000).toFixed(3);
				waterDistortionStrength = slideAmount/1000;
				break;
		  
			case "wr":
				sliderDiv.innerHTML = (slideAmount/100).toFixed(2);
				waterReflectivity = slideAmount/100;
				break;  
				
			case "t":
				sliderDiv.innerHTML = slideAmount;
				tiles = slideAmount;
				break;

			case "whd":
				factorX = slideAmount;
				if (factorX <= 0){
					factorX = -5000 - factorX;
				}
				else{
					factorX = 5000 - factorX;
				}
				sliderDiv.innerHTML = (slideAmount/450).toFixed(2);
				break;
				
			case "wvd":
				factorY = slideAmount;
				if (factorY <= 0){
					factorY = -(-5000 - factorY);
				}
				else{
					factorY = -(5000 - factorY);
				}
				sliderDiv.innerHTML = (slideAmount/450).toFixed(2);
				break;
		}
	}
	
    // register callbacks
    window.onload = myOnLoad;
	