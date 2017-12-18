const Base = require('../../api/controller/base.js');
let WXBizDataCrypt = require('../service/WXBizDataCrypt.js');
const moment = require('moment');

const appId = require('../../common/config/secret').APP_APPID

module.exports = class extends Base {
  /**
   * index action
   * @return {Promise} []
   *
   */
  async werunListAction() {
    const dateType = this.post('date') || 'today'
    const date = dateType == 'today' ? moment().format('YYYY-MM-DD') : moment().add(-1, 'days').format('YYYY-MM-DD')

    const appConfig = await this.model('app_config')
      .where({status: 1, app_type: 'mina'})
      .field(['werun_deadline', 'werun_ded_peice_limit', 'werun_ded_status', 'werun_ded_steps','werun_ded_steps_peice', 'werun_praise_limit', 'werun_praise_steps', 'werun_ranking_limit_num'])
      .find();
    const werunRankingLimitNum = appConfig.werun_ranking_limit_num < 500 ? appConfig.werun_ranking_limit_num : 500// 榜单人数, 防止hack

    const page = this.get('page') || 1;
    const size = werunRankingLimitNum || this.get('size');

    const model = this.model('werun');
    // 排名规则在用户量达到一定规模后要优化，比如，点赞数 1~20 *100；21~50 * 50
    const werunList = await model
      .where({status: 1,step_date:date})
      .field(['id', 'user_id', 'nickname', 'gender','steps', 'avatar', 'praise', 'consume_steps','remark'])
      .order(['steps + praise * '+ appConfig.werun_praise_steps +' DESC'])
      .page(page, size)
      .countSelect();

    let ranking = -1
    for(let i = 0, l = werunList.data.length; i < l; i++){
      if(werunList.data[i].user_id == think.userId){
        ranking = i + 1
      }
    }

    const myRun = await model
      .where({status: 1, user_id: think.userId, step_date:date})
      .find()

    myRun.ranking = ranking
    return this.success({werunList:werunList, myRun: myRun, appConfig: appConfig});
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
    try{
      var pc = new WXBizDataCrypt(appId, sessionKey)
      var stepData = pc.decryptData(encryptedData.encryptedData , encryptedData.iv)
    }catch (e) {
      console.log('Illegal Buffer: 微信运动数据解密失败')
      return this.fail()

    }

    const userInfo = await this.model('user').where({weixin_openid:sessionData.openid}).find()

    const werunModel = this.model('werun')
    const stepInfo = await werunModel.where({weixin_openid:sessionData.openid, step_date: moment().format('YYYY-MM-DD')}).find()


    const steps = stepData.stepInfoList[stepData.stepInfoList.length - 1].step

    const appConfig = await this.model('app_config').where({status: 1, app_type: 'mina'}).find();
    const deadtime = ' ' + appConfig.werun_deadline
    const deadline = new Date(moment().format('YYYY-MM-DD') + deadtime)
    const currentTime = new Date()
    const starttime = new Date(moment().format('YYYY-MM-DD 00:00:00.000'))
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
        if(starttime<currentTime && currentTime<deadline) {
          await werunModel.where({id: stepInfo.id}).update(werun)
        }

      }else{
        const yestInfo = await werunModel.where({weixin_openid:sessionData.openid, step_date: moment().add(-1, 'days').format('YYYY-MM-DD')}).find()
        let werun = {
          weixin_openid: sessionData.openid,
          user_id: sessionData.user_id,
          nickname:userInfo.nickname,
          gender: userInfo.gender,
          steps: steps,
          remark: yestInfo.remark || "",
          avatar:userInfo.avatar,
          update_time: moment().format('YYYY-MM-DD HH:mm:ss.SSS'),
          step_date: moment(stepData.stepInfoList[stepData.stepInfoList.length - 1].timestamp * 1000).format('YYYY-MM-DD')
        }
        if(starttime<currentTime && currentTime<deadline) {
          this.model('werun').add(werun)
        }

      }
      return this.success();
    }catch(e) {
      console.log(JSON.stringify(e))
      return this.fail()
    }



  }


  async updateWerunInfoAction() {
    if (!this.isPost) {
      return false;
    }
    const values = this.post();
    const id = values.id;

    const model = this.model('werun');

    if (id & id > 0) {
      await model.where({id: id}).update({remark: values.remark});
    } else {
      return this.fail();
    }
    return this.success();
  }
};
