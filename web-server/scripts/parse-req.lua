local decode = require "cjson.safe".decode

if ngx.ctx.req_details == nil then
    ngx.ctx.req_details = {}
end

local response_body = decode(ngx.arg[1])

if response_body ~= nil then
    ngx.ctx.req_details['minifiedFilename'] = response_body.task.minifiedFilename
end

local request_length = ngx.var.request_length
local response_length = ngx.var.upstream_response_length

if response_length ~= nil and tonumber(response_length) > 0 then
    ngx.ctx.req_details['request_length'] = request_length
    ngx.ctx.req_details['response_length'] = response_length
end