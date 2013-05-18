
CoolBeans is an Inversion of Control (IOC) / Dependency Injection (DI) library for Node.js. CoolBeans is loosely based
on ColdSpring for ColdFusion and Spring IOC for Java.  CoolBeans allows you to decouple your objects from their dependencies.
It's a single js file and so-far appears to be quick and easy.

To install:

	npm install CoolBeans

To use CoolBeans you simply create an instance of the CoolBeans and load the configuration file like this:

	var cb = require("CoolBeans");
	cb = new cb("./config/dev.json");

The above code has the only require function you should need in your entire application.  Once you've required CoolBeans
you need to create an instance of it and pass in the path to its' configuration.  This is shown above.

Once you have the fully loaded CoolBeans you can use it to quickly create fully configured singleton objects based on
its' configuration.  The config file for CoolBeans is a JSON file so the entire thing is wrapped in {}.

Each element in the root of the configuration file is a bean (bean = Java for object) that CoolBeans can create.  Here's an
example:

	{
		"fs": {"module": "fs"}
	}

This is essentially the same as:

	var fs = require("fs");

However, we now only need to define this one time for an application, rather than in each file that requires it.

You can also specify paths to modules that are not node_modules. For example:

	{
		"Recipient": {"module": "./entities/recipient"}
	}

At the most basic, the above means that CoolBeans will call require for the module and cache the results in a variable named
Recipient.

As a relative newb to Node.js, I think I've handled this correctly.  CoolBeans is a node module which means that NPM
will install into ./node_modues/CoolBeans.  The actual CoolBeans script is in the lib directory.  That means, that from
the perspective of CoolBeans, your components are three directories above it.  For this reason, CoolBeans looks three
directories above it for the module specified.  So, the Recipient module above actually turns into
../../.././entities/recipient.  This has the effect of making the paths to modules specified in the configuration file
relative to the root of your module or application.  So, if you make a module that depends on CoolBeans and later
publish it via NPM I think it should work correctly when used in other projects.

You can get any of the configured beans by calling cb.get("beanName") where beanName is the name of the bean you want
to get.  For example:

	cb.get("Recipient");

The above will lazily create the Recipient bean, cache it as a singleton, and return it.

You can get a lot more complex with configuration too.  For example, you can specify if CoolBeans should call a constructor
and what arguments to pass into the constructor.  For example:

	"codeGenerator": {
		"module": "./util/codeGenerator",
		"constructorArgs": [
			"foo",
			123
		]
	}

What the above is saying is that when we get the codeGenerator bean, we need to load the module specified then call
new on the module and pass in the values specified in the constructorArgs section to the constructor in the order
specified.  The above means:

	new codeGenerator("foo", 123);

You can also write this out to explicitly specify the constructor argument names and values.  For example:


	"codeGenerator": {
		"module": "./util/codeGenerator",
		"constructorArgs": {
			"bar": "foo",
			"blargh": 123
		}
	}

This will result in the codeGenerator component being constructed so that the "bar" argument is "foo" and the "blargh"
argument is 123.  These do not need to be specified in order.  This is particularly  convenient when some arguments are
optional.

You can also specify more complex values to pass into constructor arguments:

	"codeGenerator": {
		"module": "./util/codeGenerator",
		"constructorArgs": [
			"foo",
			123,
			{"value": [1, 2, 3]},
			{"value":
				{
					"foo": "bar",
					"bar": "foo"
				}
			}
		]
	}

Note that while you can specify a string, number, or null without indicating explicitly it's a "value", for arrays and
anonymous objects you need to provide an object with a property named "value" whose value is the value you're trying to
pass in.  The above could be written more explicitly as:

	"codeGenerator": {
		"module": "./util/codeGenerator",
		"constructorArgs": [
			{"value": "foo"},
			{"value": 123},
			{"value": [1, 2, 3]},
			{"value":
				{
					"foo": "bar",
					"bar": "foo"
				}
			}
		]
	}

And again, if you wanted to specify the names of the arguments on the constructor you could also write it as:

	"codeGenerator": {
		"module": "./util/codeGenerator",
		"constructorArgs": {
			"bar": {"value": "foo"},
			"blargh": {"value": 123},
			"someArray": {"value": [1, 2, 3]},
			"someObject": {"value":
				{
					"foo": "bar",
					"bar": "foo"
				}
			}
		}
	}

Strings, numbers, arrays, and anonymous objects are not the only things you can pass into constructors.  You can also
specify other beans that could be passed in.  For example, let's say we had a database configuration object you want to
pass into any object that is used to access data you could do the following:

	"mysql": {"module": "mysql"},
	
	"dbConfig": {
		"properties": {
			"host": "server.hostname.com",
			"port": 3306,
			"user": "mysqlUser",
			"password": "password123",
			"database": "foobar"
		}
	},
	
	"recipientDao": {
		"module": "./db/recipientDao",
		"constructorArgs": [
			{"bean": "dbConfig"},
			{"bean": "mysql"}
		]
	}

The mysql bean is simply the same as saying require("mysql").  The dbConfig is an anonymous object with properties
specified (more on this in a bit).  When the recipientDao (dao = data access object) is created, CoolBeans will see the
"bean" property and will create and pass into the constructor the fully-constructed dbConfig object and the mysql
object. Here's what that recipientDao might look like:

	module.exports = function(dbConfig, mysql){
	
		this.listRecipients = function(userId, callback){
			var client = mysql.createClient(dbConfig);
			client.query(
				"SELECT id, name, addressLine1, IfNull(addressLine2, '') as addressLine2, city, state, zip, taxDeductible, created, updated, 0 as netDonations " +
				"FROM recipient " +
				"WHERE userId = ? AND deleted = 0 "+
				"ORDER BY name",
			[userId],
			function(err, results, fields){
				client.end();
				callback(results);
			});
		}
	}

Note that there are no require statements.  The object just gets its' dependencies when it's instantiated and can
immediately use them.  These dependencies are also automatically singletons.

If you want to use a transient object you would still create an instance of it the way you always have.

I also mentioned above that CoolBeans can be used to create create and populate anonymous objects.  For example:

	"dbConfig": {
		"properties": {
			"host": "server.hostname.com",
			"port": 3306,
			"user": "mysqlUser",
			"password": "password123",
			"database": "foobar"
		}
	}

This is a somewhat long-winded way of saying

	dbConfig = {
		"host": "server.hostname.com",
		"port": 3306,
		"user": "mysqlUser",
		"password": "password123",
		"database": "foobar"
	};

However, once this object is configured in CoolBeans you can easily pass it into other objects when they are created.

You can also specify properties for not-anonymous objects. You can also mix and match constructorArgs and properties.
For example:

	"creditCardDao": {
		"module": "./db/creditCardDao",
		"constructorArgs": [
			{"bean": "dbConfig"},
			{"bean": "authorize"},
			{"bean": "mysql"},
			{"bean": "CreditCard"}
		],
		"properties": {
			"service": {"bean": "service"}
		}
	}

When CoolBeans creates the creditCardDao it will first create all the beans specified in the constructorArgs. It will then
create the creditCardDao and pass in the four already-created beans to the constructor.  Once the object is constructed
it will set the service property on the object to the specified service bean.  Note, CoolBeans will look for a setter and use
that if it can find it.  For example, in the service property above, CoolBeans will first look for a function named setservice (note
that this is case sensitive).  If it can find it, it will pass in the service bean to that function.  If not, it will
simply set a public property on the object.

There are a few other interesting capabilities of CoolBeans:

Beans don't have to be lazily loaded.  You can set a bean to load when the container loads.  For example:

	"dateFormat": {
		"module": "./util/dateFormat",
		"lazy": false
	}

Also, if you have a factory that is used to construct other objects, you can specify this using the factoryBean and
factoryMethod properties.  For example:

	"knox": {"module": "knox"},
	
	"s3client": {
		"factoryBean": "knox",
		"factoryMethod": "createClient",
		"constructorArgs": [
			{"value":
				{
					"key": "myKey",
					"secret": "mySecret",
					"bucket": "myBucket"
				}
			}
		]
	}

The above s3client bean is configured so CoolBeans uses knox to create it.  The constructor args are passed into the
factoryMethod as if it were a constructor.  The above essentially boils down to:

	s3client = knox.createClient({
		"key": "myKey",
		"secret": "mySecret",
		"bucket": "myBucket"
	});

Also, if you have a function that is used to construct other objects, you can specify this using the factoryBean property.  For example:

	"express" : {
        "module" : "express"
    },
    "app" : {
        "factoryBean" : "express"
    },

The above app bean is configured so CoolBeans uses express to create it.  The above essentially boils down to:

    var express = require('express');
	var app = express();

Version 0.0.8 or CoolBeans introduced autowiring.  Autowiring can be used so that you don't have to explicitly specify
constructor args or property values.  Consider this example from above:

	"creditCardDao": {
		"module": "./db/creditCardDao",
		"constructorArgs": [
			{"bean": "dbConfig"},
			{"bean": "authorize"},
			{"bean": "mysql"},
			{"bean": "CreditCard"}
		],
		"properties": {
			"service": {"bean": "service"}
		}
	}

This could be rewritten as such:


	"creditCardDao": {
		"module": "./db/creditCardDao",
		"autowire": true
	}

Now, when CoolBeans creates an instance of the creditCardDao bean it will assume the object needs to be constructed.  It
will introspect the constructor and find out that it has the following arguments: dbConfig, authorize, mysql, and CreditCard.  
Autowiring will make CoolBeans look to see if it has beans defined that have the same exact name.  If so, these will be 
passed in as those constructor args.  

This also works for properties.  CoolBeans will look at all the public elements in creditCardDao. If any of them exactly
match a bean defined in CoolBeans then that bean will be set into that element.  For example, the creditCardDao may
define the service property like so:

	module.exports = function(dbConfig, authorize, mysql, CreditCard){
		this.service = null;
	}

CoolBeans will see the service property, look for a bean named "service", and, if it's found set the service property
to the service bean.

Note that for CoolBeans to find this property it must have a value.  If the property is undefined it can't be found. For
example, the following will not work with CoolBeans:

	module.exports = function(dbConfig, authorize, mysql, CreditCard){
		this.service;
	}

This.service is undefined and therefore can't be "seen" outside the bean and CoolBeans will ignore it.

You can also set setters using CoolBeans.  The service property can also be set using code like this:

	module.exports = function(dbConfig, authorize, mysql, CreditCard){

		var _service;

		this.setservice = function(service){
			_service = service;
		}
	}

The setservice function will be seen by CoolBeans and the service object will be passed into it. Note that CoolBeans (like
the rest of JavaScript) is case sensitive.  You can't specify a function named setService and hope that a bean named "service"
would be passed into it.

The really nice thing about CoolBeans is that it lets the objects in your system stay focused on what they do best.  It
shouldn't be your object's responsibility to know what they need to work.  They should simply get what they need to work
when they're created.  CoolBeans also helps avoid situations in complex apps where you have dozens of lines of code just
getting dependencies created just to create one object that otherwise happens to have a lot of dependencies. Lastly, CoolBeans
allows you to easily change how your application is configured in different environments.

