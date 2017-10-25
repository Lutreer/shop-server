const Base = require('./base.js');
const qiniu = require('qiniu')
const accessKey = 'I7F2D0oeSz9LanpHH_1P0YuI87XJzNspv0qDWaPo';
const secretKey = 'WTaXAQo5eQzxKEHu-FPi93DXo431k-UOjKLFkjfT';
const mac = new qiniu.auth.digest.Mac(accessKey, secretKey);
module.exports = class extends Base {
  async uploadTokenAction() {
    if (this.isPost) { // 如果是 POST 请求
      let options = this.post();
      var putPolicy = new qiniu.rs.PutPolicy(options);
      var uploadToken = putPolicy.uploadToken(mac);

      return this.success({
        uploadToken: uploadToken
      });
    }
  }

  async deleteAction() {
    if (this.isPost) { // 如果是 POST 请求
      const config = new qiniu.conf.Config();
      const bucketManager = new qiniu.rs.BucketManager(mac, config);

      let options = this.post();
      let _this = this
      await new Promise((resolve, reject) => {
        bucketManager.delete(options.bucket, options.key, function (err, respBody, respInfo) {
          if (err) {
            reject(err, respBody, respInfo)
          } else {
            resolve(err, respBody, respInfo)
          }
        })
      }).then(function () {
        return _this.success({}, '删除成功');
      }).catch(function () {
        return _this.fail(400, '删除失败')
      })
    }
  }
};
