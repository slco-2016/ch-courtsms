

# ClientComm
Communications interface for case managers at Criminal Justice Services (CJS) in Salt Lake County, Utah. Code for America 2016 Fellowship Project.


## Set up assistance [![Join the chat at https://gitter.im/slco-2016/clientcomm](https://badges.gitter.im/slco-2016/clientcomm.svg)](https://gitter.im/slco-2016/clientcomm?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
Need assistance setting up this tool? Questions about the application structure? Send Kuan an [email](http://kuanbutts.com/contact/), or join the [conversation on Gitter](https://gitter.im/slco-2016/clientcomm).


## How to run
### Setting up dependencies and default settings
`git clone` the repository and then `cd` into it. `npm install` all dependencies. Start with `npm start`. This will run `nodemon` which will listen for changes everywhere but ignore `node_modules` folder. Make sure you have PostgreSQL up and running. Don't have PostgresSQL? Postgres.app is a great solution for Macs. Check it out [here](http://postgresapp.com/).

While in the root directory of this repo, run `touch credentials.js`. For reference, you can also use the `exampleCredentials.js` as a guide for filling out your own `credentials.js` file. Note the need for two Twilio numbers - one for testing and the other for "production." Also note that, in the future, Twilio numbers will be provisioned on an organization-by-organization basis. Your credentials should resemble the below example:

```
module.exports = {
  accountSid:         "__________________________",
  authToken:          "__________________________",
  twilioNum:          "+_________________________",
  sessionSecret:      "__________________________",
  db: {
    user:             "__________________________",
    password:         "__________________________",
    host:             "__________________________"
  },
  em: {
    password:         "__________________________"
  },
  newrelic: {
    key:              "__________________________"
  },
  aws: {
    accessKey:        "__________________________"
    secretAccessKey:  "__________________________"
  }
}
```

##### Which version(s) should I run?
I'm using NodeJS v4.4.7 as suggested on Node's organization website as the recommended general use version at present (as of August of 2016). `npm` depnedencies are all locked at their recommended versions as well.

##### Modifying knexfile.js connection settings
You will also need to configure the `knexfile.js` file. It is necessary to use the PostgreSQL as indicated in the example `development`, `testing`, and `production` objects. The reason for this is that ClientComm utilizes a number of raw SQL queries which include notation that is specific to PostgreSQL. In particular, it will be necessary to update the `connection.user` and `connection.database` values to whatever your configuration is.

### Services that ClientComm currently employs
##### Gmail
You don't have to use Gmail, but we currently send email notifications from a dummy Gmail account. The access parameters are set in that `credentials.js` file, under `em` (for email). 

##### Twilio
This is how we send and receive text messages. Set up an account and reset the phone number variables within the application. Naturally, I need to abstract away the number so that different organizations can have different phone numbers. In such a situation, I imagine that there would also need to either be an abstraction that allows for each organization to pay their own Twilio bill (and thus have their own account identifications) or that we programmatically provision each new organization with their own new address.


## Getting developer environment running
##### Setting development and production environment defaults
With those two files set up, you should be good to go. In order to set which environment you are working in, navigate to `server/db.js`. At the top of that file, the variable `env` should be set in the following manner: `var env = "development"`. You can update this variable to whatever object keys you have in you `knexfile.js`. This will allow you to control whether you are working in, for example, a testing environment, a development environment, or a production environment.

##### Styles
We use [Gulp](http://gulpjs.com/) for piping Sass into CSS for inclusion in the `public/` directory, included on pages. Make sure to view the `devDependencies` listing to be sure that related dependencies are installed when working with the code base. When developing and modifying Sass stylesheets, make sure to run `gulp sass:watch` to have Gulp automatically pipe changes into the published `public/` directory.


## Features coming soon
##### Email integration
Roughly, this will use MailGun by Rackspace to allow for `@clientcomm.org` emails. The purpose of this will be to enable the sending and receiving of emails, as well as text messages (as is presently supported).

##### Voice Support
We will be implementing voice transcription tools provided by Twilio to enable the leaving and sending of voice mails. In order to get around needing a microphone in each case manager's office, we will design the system to "call" the case manager's phone, at which point they will leave their voice message that is then sent to the designate client communication device.
