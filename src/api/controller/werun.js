const Base = require('../../api/controller/base.js');
let WXBizDataCrypt = require('../service/WXBizDataCrypt.js');
const moment = require('moment');

const appId = think.config('weixin').appid

module.exports = class extends Base {
  /**
   * index action
   * @return {Promise} []
   *
   */
  async werunListAction() {
    const dateType = this.get('date') || 'today'
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

    // 用户未上榜或者没有参与当天排名
    let ranking = -1
    for(let i = 0, l = werunList.data.length; i < l; i++){
      if(werunList.data[i].user_id == think.userId){
        ranking = i + 1
        break
      }
    }

    const myRun = await model
      .where({status: 1, user_id: think.userId, step_date:date})
      .find()

    if(myRun.id && ranking < 0) {
      // 参与了排名但没有上榜
      myRun.ranking = ranking
    }
    myRun.ranking = ranking
    return this.success({werunList:werunList, myRun: myRun, appConfig: appConfig});
  }

  /**
   *  上传或者更新微信步数
   * @post encryptedData
   * @returns {Promise.<void>} 返回一些简答的个人数据
   */
  async pushAction() {
    const encryptedData = this.post('encryptedData')
    const tokenSerivce = think.service('token', 'api');
    const sessionData = await tokenSerivce.parse();

    const sessionKey = sessionData.session_key;
    try{
      var pc = new WXBizDataCrypt(appId, sessionKey)
      // 解密微信运动数据
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
          update_time: ['exp', 'CURRENT_TIMESTAMP()'],
          step_date: moment(stepData.stepInfoList[stepData.stepInfoList.length - 1].timestamp * 1000).format('YYYY-MM-DD')
        }
        if(starttime<currentTime && currentTime<deadline) {
          await werunModel.where({id: stepInfo.id}).update(werun)
        }else{
          // TODO error code 需要规范化，前后端统一
          // 1101: 上传微信步数超出规定时间
          return this.fail(1101, '需' + appConfig.werun_deadline + '前上传')
        }

      }else{
        const yestInfo = await werunModel.where({weixin_openid:sessionData.openid, step_date: moment().add(-1, 'days').format('YYYY-MM-DD')}).find()
        let werun = {
          weixin_openid: sessionData.openid,
          user_id: sessionData.user_id,
          nickname:userInfo.nickname,
          gender: userInfo.gender,
          steps: steps,
          remark: yestInfo.remark || "想要奖品，求赞啊",
          avatar:userInfo.avatar,
          update_time: moment().format('YYYY-MM-DD HH:mm:ss.SSS'),
          step_date: moment(stepData.stepInfoList[stepData.stepInfoList.length - 1].timestamp * 1000).format('YYYY-MM-DD'),
          add_time: ['exp', 'CURRENT_TIMESTAMP()']
        }
        if(starttime<currentTime && currentTime<deadline) {
          this.model('werun').add(werun)
        }else{
          // 1101: 上传微信步数超出规定时间
          return this.fail(1101, '需' + appConfig.werun_deadline + '前上传')
        }

      }
      // 是否开启微信抵扣
      var restWerunSteps = 0 // 剩余可抵扣的步数
      var werunMaxDedUnits = 0 // 最大可抵扣的单位数量
      if(appConfig.werun_ded_status == 1){
        var myWerun = await this.model('werun')
          .where({status: 1, user_id: think.userId, step_date: moment().format('YYYY-MM-DD')})
          .find()
        if(myWerun.steps){
          restWerunSteps = myWerun.steps - myWerun.consume_steps
          werunMaxDedUnits = parseInt(restWerunSteps/appConfig.werun_ded_steps, 10)
        }

      }
      return this.success({
        steps: myWerun.steps,
        consumeSteps: myWerun.consume_steps,
        restWerunSteps: restWerunSteps,
        werunMaxDedUnits: werunMaxDedUnits
      })
    }catch(e) {
      // 一般是因为登录信息失效引起的解密失败
      console.log(JSON.stringify(e))
      return this.fail()
    }



  }
  async praiseOthersAction() {
    if (!this.isPost) {
      return false;
    }
    const values = this.post();
    const id = values.id; // 给哪个人点赞

    // 检查点赞者是否可以点赞
    const date = moment().format('YYYY-MM-DD')
    const model = this.model('werun');
    const myRun = await model
      .where({status: 1, user_id: think.userId, step_date:date})
      .find()


    const appConfig = await this.model('app_config')
      .where({status: 1, app_type: 'mina'})
      .field(['werun_deadline', 'werun_ded_peice_limit', 'werun_ded_status', 'werun_ded_steps','werun_ded_steps_peice', 'werun_praise_limit', 'werun_praise_steps', 'werun_ranking_limit_num'])
      .find();
    if(myRun.praise_times >= appConfig.werun_praise_limit){
      return this.fail(403, '每天最多赞3次', '');
    }

    // 是否在可点在的时间段
    const deadtime = ' ' + appConfig.werun_deadline
    const deadline = new Date(moment().format('YYYY-MM-DD') + deadtime)
    const currentTime = new Date()
    const starttime = new Date(moment().format('YYYY-MM-DD 00:00:00.000'))
    if(starttime<currentTime && currentTime<deadline) {
      if (id && id > 0) {
        await model.where({id: id, step_date:date}).increment('praise', 1); // 被点赞人增加赞数
        await model.where({id: myRun.id}).increment('praise_times', 1); // 点赞人记录今天点赞次数
        return this.success();
      } else {
        return this.fail(400, '不存在该用户', ''); // 好像一般也不会出现这种情况
      }
    }else{
      // TODO error code 需要规范化，前后端统一
      // 1101: 超出规定时间
      return this.fail(1101, '该时段无法点赞')
    }

  }

  // 更新求赞语
  async updateWerunInfoAction() {
    if (!this.isPost) {
      return false;
    }
    const values = this.post();
    const id = values.id * 1;

    const model = this.model('werun');

    if (id && id > 0) {
      await model.where({id: id}).update({remark: values.remark});
    } else {
      return this.fail();
    }
    return this.success();
  }


};
