jira-planningpoker
==================

Online Planning Poker with JIRA integration

Quick start
------------
To install the required gems run
`bundle install`
Note that this may take several minutes

Start the server with
`ruby server.rb`
Or, in development
`shotgun server.rb` which will cause the server to restart on every request.

Requires
---------
Ruby and the following gems:
- sinatra
- json
- data_mapper
- sinatra-websocket
- shotgun (optional, for development)

and sqlite
