const chai = require('chai')
const chaiHttp = require('chai-http')
const nock = require('nock')

const redis = require('../../clients/redis')
const server = require('../../index')

const expect = chai.expect
chai.use(chaiHttp)

describe('Issues', () => {

  it('replaces comment created including API key', async () => {

    nock('https://api.github.com')
      .delete('/repos/organization/repository/issues/comments/1')
      .query(true)
      .reply(200)

    nock('https://api.github.com')
      .post('/repos/organization/repository/issues/1/comments')
      .query(true)
      .reply(200)

    let response = await chai.request(server)
      .post('/hooks')
      .set('x-github-event', 'issue_comment')
      .send({
        action: 'created',
        comment: {
          id: 1,
          body: 'random comment ak_live_qweqwe1231q'
        },
        repository: {
          name: 'repository',
          owner: {
            login: 'organization'
          }
        },
        issue: {
          number: 1
        },
        sender: {
          login: 'testuser'
        }
      })
    
    expect(response).status(200)
  })

  it('replaces edited comment including API key', async () => {
    nock('https://api.github.com')
      .delete('/repos/organization/repository/issues/comments/1')
      .query(true)
      .reply(200)

    nock('https://api.github.com')
      .post('/repos/organization/repository/issues/1/comments')
      .query(true)
      .reply(200)

    let response = await chai.request(server)
      .post('/hooks')
      .set('x-github-event', 'issue_comment')
      .send({
        action: 'edited',
        comment: {
          id: 1,
          body: 'random comment ak_live_qweqwe1231q'
        },
        repository: {
          name: 'repository',
          owner: {
            login: 'organization'
          }
        },
        issue: {
          number: 1
        },
        sender: {
          login: 'testuser'
        }
      })
    
    expect(response).status(200)
  })

  it('notifies opened issue', async () => {
    nock('https://slack.com')
      .post('/api/chat.postMessage')
      .query(true)
      .reply(200, { ok: true })

    let response = await chai.request(server)
      .post('/hooks')
      .set('x-github-event', 'issues')
      .send({
        action: 'opened',
        issue: {
          number: 1,
          title: 'issue title',
          html_url: 'https://github.com',
          body: 'issue content',
          user: {
            login: 'githubuser'
          }
        },
        repository: {
          full_name: 'owner/repository-name',
          owner: {
            login: 'owner'
          }
        }
      })

    expect(response).status(200)
  })

  it('notifies failed notification for new issue', async () => {
    nock('https://slack.com')
      .post('/api/chat.postMessage')
      .query(true)
      .reply(200, { ok: false })

    let response = await chai.request(server)
      .post('/hooks')
      .set('x-github-event', 'issues')
      .send({
        action: 'opened',
        issue: {
          number: 1,
          title: 'issue title',
          html_url: 'https://github.com',
          body: 'issue content',
          user: {
            login: 'githubuser'
          }
        },
        repository: {
          full_name: 'owner/repository-name',
          owner: {
            login: 'owner'
          }
        }
      })

    expect(response).status(500)
  })

  it('assigns to issue on slack action', async () => {
    const callback_id = 1

    redis.set(callback_id, JSON.stringify({
      repository: {
        name: 'repository',
        owner: 'owner'
      },
      issue: {
        number: 1
      }
    }))

    nock('https://api.github.com')
      .post('/repos/owner/repository/issues/1/assignees')
      .query(true)
      .reply(200)

    nock('https://api.github.com')
      .get('/repos/owner/repository/issues/1')
      .query(true)
      .reply(200, {
        id: 1,
        assignees: [
          {
            login: 'assignee'
          }
        ]
      })

    let response = await chai.request(server)
      .post('/actions')
      .type('form')
      .send({
        payload: JSON.stringify({
          type: 'interactive_message',
          callback_id,
          response_url: 'https://github.com',
          actions: [
            {
              name: 'assign',
              type: 'button',
              value: 'assign'
            }
          ],
          user: {
            id: 'U9482EVRR'
          }
      })
    })

    expect(response).status(200)
  })

  it('adds label to issue on slack action', async () => {
    const callback_id = 1

    redis.set(callback_id, JSON.stringify({
      repository: {
        name: 'repo',
        owner: 'owner'
      },
      issue: {
        number: 1
      }
    }))

    nock('https://api.github.com')
      .post('/repos/owner/repo/issues/1/labels')
      .query(true)
      .reply(200)

    let response = await chai.request(server)
      .post('/actions')
      .type('form')
      .send({
        payload: JSON.stringify({
          type: 'interactive_message',
          callback_id,
          response_url: 'https://github.com',
          actions: [
            {
              name: 'addlabel',
              type: 'select',
              selected_options: [
                {
                  value: 'customlabel'
                }
              ]
            }
          ]
        })
      })

    expect(response).status(200)
  })

})
