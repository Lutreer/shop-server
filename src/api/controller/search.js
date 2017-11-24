const Base = require('./base.js');

module.exports = class extends Base {
  async indexAction() {
    // 取出输入框默认的关键词
    const defaultKeyword = await this.model('keywords').where({ is_default: 1 }).limit(1).find();
    // 取出热闹关键词
    const hotKeywordList = await this.model('keywords').distinct('keyword').field(['keyword']).limit(10).select();

    return this.success({
      defaultKeyword: defaultKeyword,
      hotKeywordList: hotKeywordList
    });
  }

};
