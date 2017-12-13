const Base = require('./base.js');
const rp = require('request-promise');
const _ = require('lodash');
const moment = require('moment');
const APP_SECRET = require('../../common/config/secret').APP_SECRET
const APP_APPID = require('../../common/config/secret').APP_APPID

module.exports = class extends Base {
  /**
   * index action
   * @return {Promise} []
   */
  async indexAction() {
    const avatarPath = think.RESOURCE_PATH + '/static/user/avatar/1.' + _.last(_.split('https://img6.bdstatic.com/img/image/smallpic/liutaoxiaotu.jpg', '.'));
    // rp('https://img6.bdstatic.com/img/image/smallpic/liutaoxiaotu.jpg').pipe(fs.createWriteStream(avatar_path));
    return this.success(avatarPath);
  }

  async loginByWeixinAction() {
    const code = this.post('code');
    const fullUserInfo = this.post('userInfo');
    const userInfo = fullUserInfo.userInfo;
    const ip = this.ctx.ip.length > 15 ? '127.0.0.1' : this.ctx.ip
    // 获取openid
    const options = {
      method: 'GET',
      url: 'https://api.weixin.qq.com/sns/jscode2session',
      qs: {
        grant_type: 'authorization_code',
        js_code: code,
        secret: APP_SECRET,
        appid: APP_APPID
      }
    };

    let sessionData = await rp(options);

    sessionData = JSON.parse(sessionData);
    if (!sessionData.openid) {
      return this.fail('登录失败');
    }

    // 验证用户信息完整性
    const crypto = require('crypto');
    const sha1 = crypto.createHash('sha1').update(fullUserInfo.rawData + sessionData.session_key).digest('hex');
    if (fullUserInfo.signature !== sha1) {
      return this.fail('登录失败')
    }

    // 根据openid查找用户是否已经注册
    let userId = await this.model('user').where({ weixin_openid: sessionData.openid }).getField('id', true);
    if (think.isEmpty(userId)) {
      // 注册
      //   debugger
      userId = await this.model('user').add({
        username: '微信用户' + think.uuid(6),
        password: sessionData.openid,
        register_time: moment().format('YYYY-MM-DD HH:mm:ss.SSS'),
        register_ip: ip,
        last_login_time: moment().format('YYYY-MM-DD HH:mm:ss.SSS'),
        last_login_ip: ip,
        weixin_openid: sessionData.openid,
        avatar: userInfo.avatarUrl,
        gender: userInfo.gender, // 性别 0：未知、1：男、2：女
        nickname: userInfo.nickName
      });
    }

    sessionData.user_id = userId;

    // 查询用户信息
    const newUserInfo = await this.model('user').field(['id', 'username', 'nickname', 'gender', 'avatar', 'birthday']).where({ id: userId }).find();

    // 更新登录信息
    userId = await this.model('user').where({ id: userId }).update({
      last_login_time: moment().format('YYYY-MM-DD HH:mm:ss.SSS'),
      last_login_ip: ip
    });

    const TokenSerivce = this.service('token', 'api');
    const sessionKey = await TokenSerivce.create(sessionData);

    if (think.isEmpty(newUserInfo) || think.isEmpty(sessionKey)) {
      return this.fail('登录失败');
    }

    return this.success({ token: sessionKey, userInfo: newUserInfo });
  }

  async logoutAction() {
    return this.success();
  }
};
