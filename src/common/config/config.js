// default config
module.exports = {
  default_module: 'api',

  jwt_secret: 'SLDLKKDS323ssdd@#@@gf',
  weixin: {
    secret: 'ddd3b456ee269750eda6ded093e9d065',
    appid: 'wx628852298e20424e',
    mch_id: 'mch_id',
    notify_url: 'https://api.thankni.com/order/wxpayNotify',
    key: 'key' // 微信商户平台(pay.weixin.qq.com)-->账户设置-->API安全-->密钥设置
  },


  qiniu: {
    accesskey: 'I7F2D0oeSz9LanpHH_1P0YuI87XJzNspv0qDWaPo',
    secretkey: 'WTaXAQo5eQzxKEHu-FPi93DXo431k-UOjKLFkjfT'
  },


  // 0: 订单删除，1:订单失效，2:订单取消, 3: 退货中, 4: 已退货
  // 5:下单未付款（未付款），6：仅客户端返回付款成功（下单中） 7:微信返回付款成功（已付款，5~20分钟后改为备货中），8：备货中（4~6可以退货，暂时不做）,  9:已发货，10:已签收（未评价），11：已评价
  order_status: {
    0: '订单删除',
    1: '已失效',
    2: '已取消',
    3: '退货中',
    4: '已退货',
    5: '未付款',
    6: '下单中',
    7: '已付款',
    8: '备货中',
    9: '已发货',
    10: '已送达',
    11: '已签收',
    12: '已评价',

    deleted: 0,
    expired: 1,
    canceled: 2,
    returning: 3,
    returned: 4,
    nonPayment: 5,
    booking: 6,
    paid: 7,
    stockUp: 8,
    delivered: 9,
    Unclaimed: 10,
    received: 11,
    reviewed: 12

  }

};
