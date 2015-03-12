
describe 'An example Gagarin test suite by Coffee-script', ->

  server = meteor ->
    # probably the best place for your fixtures

  client = browser server, ->
    # some initialization on client (if needed)

  it 'should just work', ->
    return client.execute( ->
     # some code to execute
    ).then ->
      server.execute ->
        # some code to execute on server
