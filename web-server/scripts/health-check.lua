local httpc = require("resty.http").new()
local encode = require "cjson".encode

local res, err = httpc:request_uri("http://app:3000/doc", {
    method = "GET",

})
if err then
    ngx.status = ngx.HTTP_SERVICE_UNAVAILABLE
    ngx.header["content-type"] = "application/json"
    local response = { status = false }
    ngx.print(encode(response))
    return
end
ngx.status = ngx.HTTP_OK
ngx.header["content-type"] = "application/json"
local response = { status = true }
ngx.print(encode(response))
