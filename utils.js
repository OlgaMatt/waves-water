	function getAxis(p0,p1,o) {
		var crs = cross(subtract(p1,o),subtract(p0,o))
		if (crs[0] == 0 && crs[1] == 0 && crs[2] == 0) {
			return crs
		}
		else {
			return normVec(crs).slice(0,3);
		}
	}
		
	function getAlpha(p0,p1,r,d) {
		var alpha = subtract(prime(p1,r,d),prime(p0,r,d))
		return -Math.sqrt(dot(alpha,alpha));
	}
		
		
	function prime(pi,r,d) {
		return scale(Math.sqrt(r**2/(pi[0]**2+pi[1]**2+d**2)),pi);
	}
		
	//output quaternion [x y z w]
	function AxisAngle2Quaternion(v, alpha) {
		return [v[0] * Math.sin(alpha / 2), v[1] * Math.sin(alpha / 2), v[2] * Math.sin(alpha / 2), Math.cos(alpha / 2)]
	}
		
	//input quaternions [x y z w]
	//output quaternions [x y z w]
	function multQuaternion(q1, q2) {
		v1 = q1.slice(0,3);
		w1 = q1[3];
		v2 = q2.slice(0,3);
		w2 = q2[3];
		a = w1*w2 - dot(v1,v2);
		b = sum(scale(w2,v1),sum(scale(w1,v2), cross(v1,v2)));
		b.push(a);
		return b;
	}
		
		
	function Quaternion2Matrix(q) {
		nq = normalizeQuaternion(q);
		w = q[3];
		x = q[0];
		y = q[1];
		z = q[2];
		return [1-2*y**2-2*z**2	, 2*x*y-2*w*z		, 2*x*z+2*w*y		, 0,
				2*x*y+2*w*z		, 1-2*x**2-2*z**2	, 2*y*z-2*w*x		, 0,
				2*x*z-2*w*y		, 2*y*z+2*w*x		, 1-2*x**2-2*y**2	, 0,
				0				, 0					, 0					, 1];
	}
		
	function normalizeQuaternion(q) {
		mag = Math.sqrt(q[0]**2+q[1]**2+q[2]**2+q[3]**2);
		return scale(1/mag,q);
	}

	function loadImage(url, callback) {
	  var image = new Image();
	  image.crossOrigin = "anonymous";
	  image.src = url;
	  image.onload = callback;
	  return image;
	}

	function getCoords() {
		var gCanvasElement = document.getElementById("A-CANVAS");
		var x;
		var y;
		if (event.pageX || e.pageY) {
			x = event.pageX;
			y = event.pageY;
		}
		else {
			x = event.clientX + document.body.scrollLeft + document.documentElement.scrollLeft; 
			y = event.clientY + document.body.scrollTop + document.documentElement.scrollTop; 
		} 
		x -= gCanvasElement.offsetLeft;
		y -= gCanvasElement.offsetTop;
		y = gCanvasElement.height - y;
		return [x,y];
	}