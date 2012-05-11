describe("ConnectPad", function() {

  var xhr;
  var requests;

  beforeEach(function() {
    xhr = sinon.useFakeXMLHttpRequest();
    requests = [];

    xhr.onCreate = function (request) {
      requests.push(request);
    };
  });

  afterEach(function() {
    xhr.restore();
  });


  it("builds the right api urls", function() {
    var funct = "myTestFunction";
    var params = {a: "value", another: "one"};
    expect(connectPad.urlFor(funct, params)).toEqual("http://ownpad.unhosted.org:82/ownapi/1/myTestFunction?a=value&another=one");
  });

  it("builds params from session Obj", function () {
    var sessionObj = {
      userAddress: "my@email.net",
      storageInfo: {template: "template in here", oauth: "oauth string in here"},
      bearerToken: "SECRETBEARERTOKENHERE"
    };
    var params = connectPad.paramsFor(sessionObj);
    expect(params.bearerToken).toEqual("SECRETBEARERTOKENHERE");
    expect(JSON.parse(params.storageInfo).template).toEqual("template in here");
    expect(params.userAddress).toEqual("my@email.net");
  });

  // integration test
  it("sends a request to the url created", function () {
    var sessionObj = {
      userAddress: "my@email.net",
      storageInfo: {template: "template in here", oauth: "oauth string in here"},
      bearerToken: "SECRETBEARERTOKENHERE"
    };
    var callback = sinon.spy();
    connectPad.connect(sessionObj, callback); // handing empty session obj - we stub it anyway
    expect(requests.length).toEqual(1);
    expect(requests[0].url).toMatch(/\/connect\?/);
    expect(requests[0].method).toEqual("GET");
    requests[0].respond(200, { "Content-Type": "application/json" },
      '[{ "id": 12, "comment": "Hey there" }]');
    //TODO: make this use a proper err, status return code
    expect(callback).toHaveBeenCalledWith(true);
  });
});
