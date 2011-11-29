var fs = require("fs");


module.exports = function(config){
	me = this;

	// load the configuration file
	var json = JSON.parse(fs.readFileSync(config, "utf-8"));

	var cache = {};

	this.get = function(name){
		//console.log("constructing: " + name);

		// does this exist in the cache yet?
		if(cache[name] != undefined){
			return cache[name];
		}

		var config = json[name];
		var obj;
		
		// it's not cached, create it
		if(json[name].module != undefined){
			obj = require(json[name].module);
		} else {
			obj = {};
		}

		// now that I've got this object load its dependencies

		// get the constructor arguments
		var constArgs = [];
		if(config.constructorArgs != undefined){

			// if we have constructor args then we know we need to construct this object
			config.construct = true;

			// loop over the constructor properties
			for(var i = 0 ; i < config.constructorArgs.length ; i++){
				var constructorArg = config.constructorArgs[i];

				if(typeof constructorArg == "string" || typeof constructorArg == "number"){
					// this is a shortcut to just set a string value.
					constArgs[i] = constructorArg;
				} else if(constructorArg.value != undefined){
					constArgs[i] = constructorArg.value;
				} else if(constructorArg.bean != undefined) {
					constArgs[i] = me.get(constructorArg.bean);
				}
			}
		}

		// is this a factory where we need to call a method to create an instance of our object?
		if(config.factoryBean != undefined && config.factoryMethod != undefined){
			// get the factory
			var factory = me.get(config.factoryBean);

			var instantiate = "obj = factory." + config.factoryMethod + "(" + getArgs(constArgs) + ")";

			// call the factory
			eval(instantiate);
		} else {
			// do we need to construct this object?
			if(config.construct != undefined && config.construct){
				var instantiate = "obj = new obj(" + getArgs(constArgs) + ")";

				eval(instantiate);
			}
		}

		// cache this object now
		cache[name] = obj;

		// add properties

		if(config.properties != undefined){
			for(var prop in config.properties){
				var property = config.properties[prop];

				var value = null;

				// get the value
				if(typeof property == "string" || typeof property == "number"){
					// this is a shortcut to just set a string value.
					value = property;
				} else if(property.value != undefined){
					value = property.value;
				} else if(property.bean != undefined) {
					value = me.get(property.bean);
				}

				// does this object have a setter for this property?
				var setter = (obj["set" + prop] != undefined);

				// set the value
				if(setter){
					eval("obj.set" + prop + "(value)");
				} else {
					obj[prop] = value;
				}
			}
		}


		return cache[name];
	}

	var getArgs = function(constArgs){
		var args = "";

		for(var i = 0 ; i < constArgs.length; i++){
			args += "constArgs[" + i + "]";
			if(i+1 < constArgs.length ){
				args += ","
			}
		}

		return args;
	}



	// iterate over the json and look for any non-lazy objects
	for(var key in json){
		if(json[key].lazy == false){
			// load this object
			me.get(key);
		}
	}
}