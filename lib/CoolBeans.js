var fs = require("fs");


module.exports = function(config){
	me = this;

	// load the configuration file
	var json;
	switch (typeof config) {
		case 'object':
			json = config;
			break;
    
		default:
			json = JSON.parse(fs.readFileSync(config, "utf-8"));
	}

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
			try{
				obj = require(json[name].module);
			} catch(e) {
				obj = require(__dirname + "/../../../" + json[name].module);
			}
		} else {
			obj = {};
		}

		// now that I've got this object load its dependencies

		/*************************
		 ****** Constructor *******
		 *************************/


		// autowire constructor args
		if(config.autowire != undefined && config.autowire == true){
			// get the constructor args
			var orderedArgs = getOrderedArgs(obj, config);

			// define constructor args object if it's not already defined
			if(config.constructorArgs == undefined){
				config.constructorArgs = {};
			}

			for(var arg in orderedArgs){
				// get the name of the constructor arg
				arg = orderedArgs[arg];

				// is there a bean defined with this same name?
				if(json[arg] != undefined){
					config.constructorArgs[arg] = {"bean": arg}
				}
			}
		}

		// get the constructor arguments
		var constArgs = [];
		if(config.constructorArgs != undefined){
			// if we have constructor args then we know we need to construct this object
			config.construct = true;


			if(config.constructorArgs instanceof Array){ // we have an array of arguments
				// loop over the constructor properties
				for(var i = 0 ; i < config.constructorArgs.length ; i++){
					constArgs[i] = getConstructorArg(config.constructorArgs[i]);
				}

			} else if(config.constructorArgs instanceof Object){ // we have a hash of arguments
				var orderedArgs = getOrderedArgs(obj, config);

				for(var i in orderedArgs){
					// get the constructorArg definition
					constArgs[i] = getConstructorArg(config.constructorArgs[orderedArgs[i]]);
				}
			}
		}


		// is this a factory where we need to call a method to create an instance of our object?
		if(config.factoryBean != undefined){
			// get the factory
			var factory = me.get(config.factoryBean);
			if(config.factoryMethod != undefined){
				var instantiate = "obj = factory." + config.factoryMethod + "(" + getArgs(constArgs) + ")";
			} else {
				var instantiate = "obj = factory(" + getArgs(constArgs) + ")";
			}

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

		/*************************
		 ****** properties *******
		 *************************/

		// autowire properties
		if(config.autowire != undefined && config.autowire == true){

			// define properties object if it's not already defined
			if(config.properties == undefined){
				config.properties = {};
			}

			for(var prop in obj){
				// is there a bean with this exact name?
				if(json[prop] != undefined){
					config.properties[prop] = {"bean": prop};
				} else if(prop.substr(0, 3) == "set" && json[prop.substr(3)] != undefined) {
					config.properties[prop.substr(3)] = {"bean": prop.substr(3)};
				}
			}
		}

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

	var getConstructorArg = function (constructorArg) {
		if (constructorArg == undefined || constructorArg == null || typeof constructorArg == "string" || typeof constructorArg == "number") {
			// this is a shortcut to just set a string value (or null or undefined)
			return constructorArg;

		} else if (constructorArg.value != undefined) {
			// value was explicitly defind
			return constructorArg.value;

		} else if (constructorArg.bean != undefined) {
			// an object was specified
			return me.get(constructorArg.bean);

		}
	}

	var getOrderedArgs = function(obj, config){
		// is this a factory where we need to call a method to create an instance of our object?
		if(config.factoryBean != undefined && config.factoryMethod != undefined){
			// get the factory
			var factory = me.get(config.factoryBean);

			// get the obj (but don't try to construct it)
			var obj = factory[config.factoryMethod];
		}

		return obj.toString ().match (/function\s+\w*\s*\((.*?)\)/)[1].split (/\s*,\s*/);
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