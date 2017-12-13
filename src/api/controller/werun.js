const Base = require('../../api/controller/base.js');
let WXBizDataCrypt = require('../service/WXBizDataCrypt.js');
const moment = require('moment');

const appId = require('../../common/config/secret').APP_APPID

module.exports = class extends Base {
  /**
   * index action
   * @return {Promise} []
   */
  async werunListAction() {
    const dateType = this.post('date') || 'today'
    const date = dateType !== 'today' ? moment().format('YYYY-MM-DD') : moment().add(-1, 'days').format('YYYY-MM-DD')

    const appConfig = await this.model('app_config').where({status: 1, app_type: 'mina'}).find();
    const werunRankingLimitNum = appConfig.werun_ranking_limit_num

    const page = this.get('page') || 1;
    const size = werunRankingLimitNum || this.get('size');

    const model = this.model('werun');
    // 排名规则在用户量达到一定规模后要优化，比如，点赞数 1~20 *100；21~50 * 50
    const werunList = await model
      .where({status: 1,step_date:date})
      .field(['id', 'user_id', 'nickname', 'gender','steps', 'avatar', 'praise', 'consume_steps','remark'])
      .order(['steps + praise * 20 DESC'])
      .page(page, size)
      .countSelect();

    let ranking = -1
    for(let i = 0, l = werunList.data.length; i < l; i++){
      if(werunList.data[i].user_id == think.userId){
        ranking = i + 1
      }
    }

    const myRun = await model
      .where({status: 1, user_id: think.userId})
      .find()

    myRun.ranking = ranking
    return this.success({werunList:werunList, myRun: myRun});
  }

  /**
   *
   * @post encryptedData
   * @returns {Promise.<void>}
   */
  async pushAction() {
    const encryptedData = this.post('encryptedData')
    const tokenSerivce = think.service('token', 'api');
    const sessionData = await tokenSerivce.parse();

    const sessionKey = sessionData.session_key;
    var pc = new WXBizDataCrypt(appId, sessionKey)
    var stepData = pc.decryptData(encryptedData.encryptedData , encryptedData.iv)
    const userInfo = await this.model('user').where({weixin_openid:sessionData.openid}).find()

    const werunModel = this.model('werun')
    const stepInfo = await werunModel.where({weixin_openid:sessionData.openid, step_date: moment().format('YYYY-MM-DD')}).find()

    const steps = stepData.stepInfoList[stepData.stepInfoList.length - 1].step

    const appConfig = await this.model('app_config').where({status: 1, app_type: 'mina'}).find();
    const deadline = new Date(moment().format('YYYY-MM-DD') + ' 22:30:00')
    const currentTime = new Date()
    const starttime = new Date(moment().format('YYYY-MM-DD') + ' 00:00:00')
    try{
      if(stepInfo.id){
        let werun = {
          nickname:userInfo.nickname,
          gender: userInfo.gender,
          steps: steps,
          avatar:userInfo.avatar,
          update_time: moment().format('YYYY-MM-DD HH:mm:ss.SSS'),
          step_date: moment(stepData.stepInfoList[stepData.stepInfoList.length - 1].timestamp * 1000).format('YYYY-MM-DD')
        }
        if(starttime<currentTime<deadline) {
          await werunModel.where({id: stepInfo.id}).update(werun)
        }

      }else{
        let werun = {
          weixin_openid: sessionData.openid,
          user_id: sessionData.user_id,
          nickname:userInfo.nickname,
          gender: userInfo.gender,
          steps: steps,
          avatar:userInfo.avatar,
          update_time: moment().format('YYYY-MM-DD HH:mm:ss.SSS'),
          step_date: moment(stepData.stepInfoList[stepData.stepInfoList.length - 1].timestamp * 1000).format('YYYY-MM-DD')
        }
        if(starttime<currentTime<deadline) {
          this.model('werun').add(werun)
        }

      }
      return this.success();
    }catch(e) {
      return this.fail()
    }



  }



  async updatePicAction() {
    if (!this.isPost) {
      return false;
    }
    const values = this.post();
    const id = this.post('id');

    const model = this.model('brand');

    if (id > 0) {
      await model.where({id: id}).update(values);
    } else {
      return this.fail();
    }
    return this.success();
  }
};
