/* GpuMesh:
  (indices to buffers holding) a mesh on video card RAM */
var GpuMesh = {
   bufferVerts : 0,
   bufferTris : 0,
   nTris : 0,
    minX: 0,                  // ABB limits
    maxX: 0,
    minY: 0,
    maxY: 0,
    minZ: 0,
    maxZ: 0,
   
   init : function(gl) {
       this.bufferVerts = gl.createBuffer();
       this.bufferTris = gl.createBuffer();
       this.nTris = 0;
   },
    
   draw : function(gl) {
      gl.bindBuffer(
         gl.ARRAY_BUFFER, 
         this.bufferVerts 
      );
      
      gl.enableVertexAttribArray(posAttributeIndex);
      gl.vertexAttribPointer(posAttributeIndex , 
               3, gl.FLOAT , false , 6*4, 0);

      gl.enableVertexAttribArray(normAttributeIndex);
      gl.vertexAttribPointer(normAttributeIndex , 
               3, gl.FLOAT , false , 6*4, 3*4);
               
      gl.bindBuffer( 
         gl.ELEMENT_ARRAY_BUFFER, 
         this.bufferTris 
      );
      
      gl.drawElements( 
         gl.TRIANGLES, 
 //         gl.POINTS,
         this.nTris*3, 
         gl.UNSIGNED_SHORT, 
         0
      );
   },
   
   storeFromCpu : function( gl, mesh ) {
        this.nTris = mesh.tris.length / 3;
        this.minX = mesh.minX;
        this.maxX = mesh.maxX;
        this.minY = mesh.minY;
        this.maxY = mesh.maxY;
        this.minZ = mesh.minZ;
        this.maxZ = mesh.maxZ;
  
        this.bufferVerts = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.bufferVerts );
        gl.bufferData(
           gl.ARRAY_BUFFER, 
           mesh.verts, 
           gl.STATIC_DRAW
        );
         
        this.bufferTris = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.bufferTris );
        gl.bufferData(
           gl.ELEMENT_ARRAY_BUFFER, 
           mesh.tris, 
           gl.STATIC_DRAW
        );
   }
}

/*  CpuMesh: a mesh in main memory */
var CpuMesh = {

   /* fields */
    verts: new Float32Array,  // geo + norms
    tris: new Uint16Array,    // connectivity
    minX: 0,                  // ABB limits
    maxX: 0,
    minY: 0,
    maxY: 0,
    minZ: 0,
    maxZ: 0,
   
   /* methods */  
  
	// shortcuts
	vx: function (i){ return  this.verts[i*6+0]; },
	vy: function (i){ return  this.verts[i*6+1]; },
	vz: function (i){ return  this.verts[i*6+2]; },

	nx: function (i){ return  this.verts[i*6+3]; },
	ny: function (i){ return  this.verts[i*6+4]; },
	nz: function (i){ return  this.verts[i*6+5]; },
	
	nv: function (){ return this.verts.length/6; },
	nf: function (){ return this.tris.length/3; },
	
	// returns position of vert number i
	posOfVert: function( i ){
		return [ this.vx(i), this.vy(i), this.vz(i) ];
	},

	// returns normal of vert number i
	normalOfVert: function( i ){
		return [ this.nx(i), this.ny(i), this.nz(i) ];
	},
	
	// sets the normal of vert i
	setNormalOfVert: function( i , n ){
		this.verts[i*6+3] = n[0];
		this.verts[i*6+4] = n[1];
		this.verts[i*6+5] = n[2];
	},
	
	// returns normal of face number i
	normalOfFace: function(i){
		var vi, vj, vk;
		vi = this.tris[ i*3 + 0 ];
		vj = this.tris[ i*3 + 1 ];
		vk = this.tris[ i*3 + 2 ];
		var pi,pj,pk;
		pi = this.posOfVert( vi );
		pj = this.posOfVert( vj );
		pk = this.posOfVert( vk );
		var norm = cross( subtract( pi, pk ), subtract( pj, pk ) );
		return normalize(norm);
	},
	
    // input mesh from OFF format - tris only
	importOFFfromString:function (string){
        string.replace("\n ","\n");
//		var tokens = string.split(/[\n' ']/);
		var tokens = string.split(/\s+/);
		// tokens[0] == "OFF"
		var ti = 0; // token index
		ti++;  // skip "OFF"
		var nv = tokens[ti++]; // number of vertices
		var nf = tokens[ti++]; // number of faces
		ti++;  // skip number of edges
        console.log(tokens[1] + ", " + tokens[2] + ", " + tokens[3]);
        console.log(tokens[4] + ", " + tokens[5] + ", " + tokens[6]);
		
		this.verts = new Float32Array( nv*6 );
			
		for (var i=0; i<nv; i++) {
			this.verts[ i*6 + 0  ] = tokens[ti++]; // X
			this.verts[ i*6 + 1  ] = tokens[ti++]; // Y
			this.verts[ i*6 + 2  ] = tokens[ti++]; // Z
//            console.log(this.verts[ i*6 + 0  ] + ", " +
//                       this.verts[ i*6 + 1  ] + ", " +
//                       this.verts[ i*6 + 2  ]);
		}

		this.tris = new Uint16Array( nf*3 );
		for (var i=0; i<nf; i++) {
			if (tokens[ti++]!=3) { // number of edges (3?) 
                console.log("At face " + i + ": Non triangular face! file input failed.");
                return;
            }
			this.tris[ i*3 + 0 ] = tokens[ti++]; // v0
			this.tris[ i*3 + 1 ] = tokens[ti++]; // v1
			this.tris[ i*3 + 2 ] = tokens[ti++]; // v2
		}
		console.log("Loaded "+nf+" faces and "+nv+" vertices");
	},
	
	updateAABB: function(){
		if (this.nv()==0) return;
		this.minX = this.maxX = this.vx(0);
		this.minY = this.maxY = this.vy(0);
		this.minZ = this.maxZ = this.vz(0);
		for (var i=1; i<this.nv(); i++) {
			if (this.minX>this.vx(i)) this.minX = this.vx(i);
			if (this.maxX<this.vx(i)) this.maxX = this.vx(i);
			if (this.minY>this.vy(i)) this.minY = this.vy(i);
			if (this.maxY<this.vy(i)) this.maxY = this.vy(i);
			if (this.minZ>this.vz(i)) this.minZ = this.vz(i);
			if (this.maxZ<this.vz(i)) this.maxZ = this.vz(i);
		}
	},
	
	updateNormals: function(){
		// 1: clear all normals
		for (var i=0; i<this.nv(); i++) this.setNormalOfVert(i, [0,0,0] );
		
		// 2: cumulate normals of all faces on their three vertices
		for (var i=0; i<this.nf(); i++)  {
			var n = this.normalOfFace(i);
			
			var vi, vj, vk; // indices of the three vertices of face i
			vi = this.tris[ i*3 + 0 ];
			vj = this.tris[ i*3 + 1 ];
			vk = this.tris[ i*3 + 2 ];
			
			this.setNormalOfVert( vi, sum( n, this.normalOfVert(vi) ) );
			this.setNormalOfVert( vj, sum( n, this.normalOfVert(vj) ) );
			this.setNormalOfVert( vk, sum( n, this.normalOfVert(vk) ) );
		}
		
		// ciclo 3: normalize all normals
		for (var i=0; i<this.nv(); i++) 
			this.setNormalOfVert( i, normalize( this.normalOfVert(i) )  );
	},

	// centers and rescales the mesh
	// invoke AFTER updating AABB
	autocenterNormalize: function(){
		var tr = translationMatrix( 
		    -(this.minX+this.maxX)/2.0,
		    -(this.minY+this.maxY)/2.0,
		    -(this.minZ+this.maxZ)/2.0
		);
		var dimX = this.maxX-this.minX;
		var dimY = this.maxY-this.minY;
		var dimZ = this.maxZ-this.minZ;
		var dimMax = Math.max( dimZ, dimY, dimX );
        for (var i=0; i<this.nv(); i++) {
			this.verts[ i*6 + 0  ] = (this.verts[i*6+0]-(this.minX+this.maxX)/2.0)*2.0/dimMax; // X
			this.verts[ i*6 + 1  ] = (this.verts[i*6+1]-(this.minY+this.maxY)/2.0)*2.0/dimMax; // Y
			this.verts[ i*6 + 2  ] = (this.verts[i*6+2]-(this.minZ+this.maxZ)/2.0)*2.0/dimMax; // Z
		}
        this.minX = (this.minX-this.maxX)/dimMax;
        this.maxX = (this.maxX-this.minX)/dimMax;
        this.minY = (this.minY-this.maxY)/dimMax;
        this.maxY = (this.maxY-this.minY)/dimMax;
        this.minZ = (this.minZ-this.maxZ)/dimMax;
        this.maxZ = (this.maxZ-this.minZ)/dimMax;
    },

	// returns the matrix which centers the mesh and scales it 
	// invoke AFTER updating AABB
	autocenteringMatrix: function(){
		var tr = translationMatrix( 
		    -(this.minX+this.maxX)/2.0,
		    -(this.minY+this.maxY)/2.0,
		    -(this.minZ+this.maxZ)/2.0
		);
		var dimX = this.maxX-this.minX;
		var dimY = this.maxY-this.minY;
		var dimZ = this.maxZ-this.minZ;
		var dimMax = Math.max( dimZ, dimY, dimX );
		var sc = scalingMatrix( 2.0/dimMax );
		
		return multMatrix( sc , tr );
	},

       
    
    
    
    /* Procedural meshes */
    makeCube: function() {
      this.allocate( 28 , 12 );
	  this.setVert(0,-1,-1,+1);
	  this.setVert(1,-1,+1,+1);
	  this.setVert(2,+1,+1,+1);
	  this.setVert(3,+1,-1,+1);
	  for (var i = 0; i < 4; i++){
		  this.setNorm(i, 0,0,1);
	  }
	  this.setVert(4,+1,-1,+1);
	  this.setVert(5,+1,+1,+1);
	  this.setVert(6,+1,+1,-1);
	  this.setVert(7,+1,-1,-1);
	  for (var i = 4; i < 8; i++){
		  this.setNorm(i, -1,0,0);
	  }
	  this.setVert(8,+1,-1,-1);
	  this.setVert(9,+1,+1,-1);
	  this.setVert(10,-1,+1,-1);
	  this.setVert(11,-1,-1,-1);
	  for (var i = 8; i < 12; i++){
		  this.setNorm(i, 0,0,1);
	  }
	  this.setVert(12,-1,-1,-1);
	  this.setVert(13,-1,+1,-1);
	  this.setVert(14,-1,+1,+1);
	  this.setVert(15,-1,-1,+1);
	  for (var i = 12; i < 16; i++){
		  this.setNorm(i, -1,0,0);
	  }
	  this.setVert(16,-1,+1,+1);
	  this.setVert(17,-1,+1,-1);
	  this.setVert(18,+1,+1,-1);
	  this.setVert(19,+1,+1,+1);
	  for (var i = 16; i < 20; i++){
		  this.setNorm(i, 0,1,0);
	  }
	  this.setVert(20,-1,-1,-1);
	  this.setVert(21,-1,-1,+1);
	  this.setVert(22,+1,-1,+1);
	  this.setVert(23,+1,-1,-1);
	  for (var i = 20; i < 24; i++){
		  this.setNorm(i, 0,1,0);
	  }
	  
	  this.setQuad(0,0,1,2,3);
	  this.setQuad(2,4,5,6,7);	
	  this.setQuad(4,8,9,10,11);
	  this.setQuad(6,12,13,14,15);	
	  this.setQuad(8,16,17,18,19);	
	  this.setQuad(10,20,21,22,23);		  
	  /*
      this.setVert( 0, -1,-1,+1 );
      this.setVert( 1, +1,-1,+1 );
      this.setVert( 2, -1,-1,-1 );
      this.setVert( 3, +1,-1,-1 );
      this.setVert( 4, -1,+1,+1 );
      this.setVert( 5, +1,+1,+1 );
      this.setVert( 6, -1,+1,-1 );
      this.setVert( 7, +1,+1,-1 );
      
      this.setQuad( 0, 0,1,5,4 ); // setta anche 1
      this.setQuad( 2, 3,2,6,7 );
      this.setQuad( 4, 2,0,4,6 );
      this.setQuad( 6, 1,3,7,5 );
      this.setQuad( 8, 5,7,6,4 );
      this.setQuad(10, 1,0,2,3 );
	  */
   },

   makePlane: function( /*int*/ res) {
      this.allocate( (res+1)**2 , (res**2)*2 );
	  
	  var a = 2.0/res;
	  for (var i=0; i<=res; i++) {
		  for (var j=0; j<=res; j++) {
			  this.setVert(i*(res+1)+j,-1+(j*a),0,-1+(i*a));
		  }
	  }
	  for (var k=0; k<(res+1)**2; k++){
		  this.setNorm(k,0, k/(res+1)**2,((res+1)**2-k)/(res+1)**2);
	  }
	  for (var p=0; p<res; p++){
		  for (var q=0; q<res; q++){
			 this.setQuad((p*(res)+q)*2,p*(res+1)+q,p*(res+1)+q+1,(p+1)*(res+1)+q+1,(p+1)*(res+1)+q);
		  }
	  }
   },

   makeCone: function( /*int*/ res ) {
      this.allocate( res*2, res*2 );
      
      for (var i=0; i<res; i++) {
         var a = 2 * Math.PI * i/res;
         var s = Math.sin(a);
         var c = Math.cos(a);
         this.setVert( i     ,  c,-1, s );
         this.setVert( i+res ,  0,+1, 0 );
         const k = 1.0 / Math.sqrt(1.25);
         this.setNorm( i     ,  c*k, 0.5*k, s*k );
         this.setNorm( i+res ,  c*k, 0.5*k, s*k );
      }
      
      for (var i=0; i<res; i++) {
         var j = (i+1)%res;
         this.setQuad( i*2,  i, j, j+res, i+res );
      }      
   },

   makeCylinder: function( /*int*/ res ) {
      this.allocate( res*2, res*2 );
      
      for (var i=0; i<res; i++) {
         var a = 2 * Math.PI * i/res;
         var s = Math.sin(a);
         var c = Math.cos(a);
         this.setVert( i     ,  c,-1, s );
         this.setVert( i+res ,  c,+1, s );
         this.setNorm( i     ,  c, 0, s );
         this.setNorm( i+res ,  c, 0, s );
      }
      
      for (var i=0; i<res; i++) {
         var j = (i+1)%res;
         this.setQuad( i*2,  i, j, j+res, i+res );
      }      
   },

   /* private methods */
   
   allocate: function( nverts, ntris ) {
      this.verts = new Float32Array( nverts*6 ); 
      this.tris = new Uint16Array( ntris*3 );
   },

   setTri: function( i, va, vb, vc ){
      this.tris[ i*3 +0 ] = va;
      this.tris[ i*3 +1 ] = vb;
      this.tris[ i*3 +2 ] = vc;
   },
   
   setQuad: function( i, va, vb, vc, vd){
      // diagonal split!
      this.setTri( i+0, va, vb, vd );
      this.setTri( i+1, vd, vb, vc );
   },
   
   setVert: function( i, x,y,z ){
      this.verts[ i*6+0 ] = x;
      this.verts[ i*6+1 ] = y;
      this.verts[ i*6+2 ] = z;
   },
   
   setNorm: function( i, nx,ny,nz ){
      this.verts[ i*6+3 ] = nx;
      this.verts[ i*6+4 ] = ny;
      this.verts[ i*6+5 ] = nz;
   },
   
   
}