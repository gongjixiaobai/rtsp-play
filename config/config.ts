// 服务的ip与端口, 用于配置服务的ip与端口。从环境变量中获取，如果没有则使用默认值
const  wsConfig = {
    ip: process.env.IP || '127.0.0.1',
    port: process.env.PORT || 9999
}

export { wsConfig }