jira-planningpoker
==================

Online Planning Poker with JIRA integration
---------------------------------------

(JIRA is currently hardcoded to work with Siteworx's internal JIRA instance during development of this project)
The frontend is written in jQuery and is entirely dynamic. The frontend makes ajax calls to the backend. 
The backend is a RESTful web service with an API described here: [API Doc](http://bit.ly/1evCteH)
The backend is written in Sinatra with a relational database mapped by DataMapper.
The database is Sqlite in development and Postgres in production.

[Pusher](http://pusher.com) is used to push changes to the frontend.

The whole project is set up to be deployed in a [Heroku](http://heroku.com) instance. It could be modified to run on another server, however.

Quick start
------------
To install the required gems run
`bundle install`
Note that this may take several minutes

Start the server with
`ruby server.rb`
Or, in development
`shotgun server.rb` which will cause the server to restart on every request.

Deploying to Heroku
----------------
- Setup a Heroku app.
- Install the Postgres addon
- [Make the Postgres database url you were assigned the default DATABASE_URL](https://devcenter.heroku.com/articles/heroku-postgresql#establish-primary-db)
- Install the pusher add-on
- Add Heroku as a remote for git
- `git push heroku`

Requires
---------
Ruby and the bundler gem. Bundler will install all other required components. A Heroku account is preferred, though it may run in other environments with some configuration.
