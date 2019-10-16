;(function (win, doc) {

  function Mine (opt) {
    this.el = opt.el;
    this.table = opt.table;
    this.lv = opt.level ? opt.level : 'primary';
    this.level = this.levelObj[this.lv];

    this.statusBtn = this.el.getElementsByClassName('status')[0];
    this.timerBox = this.el.getElementsByClassName('number-box timer')[0]; // 记载时间的盒子
    this.flagNumBox = this.el.getElementsByClassName('number-box flag-num')[0]; // 记载剩余旗子数量的盒子
    this.messageBox = doc.getElementById('J_message');

    this.recordBtn = doc.getElementById('J_record');

    // 存储相应的格子DOM元素
    this.boxes = [];
    // 存储格子对应的数据
    this.squares = [];
    // 当前点击的格子
    this.currentSquare = null;
    // 游戏的状态
    this.gameStatus = 'normal';

    this.theFirstClick = false; // 第一次点击时记录值
    this.theSecondClick = false; // 第一次点击时记录值
    this.theSecondUp = false; // 第二次抬起记录值

    // this.dblClick = false; // 双击标识
    this.currentSquare = null;

    // 游戏记录
    this.record = JSON.parse(localStorage.getItem('record')) || {};
  }

  Mine.prototype.levelObj = {
    'primary': {
      col: 9,
      row: 9,
      mineNum: 10
    },
    'middle': {
      col: 16,
      row: 16,
      mineNum: 40
    },
    'high': {
      col: 25,
      row: 25,
      mineNum: 99
    }
  }

  /**
   * 游戏初始化
   */
  Mine.prototype.init = async function (handle) {

    this.flagNum = this.level.mineNum; // 剩余旗子数量

    this.timeThousands = 0;
    this.time = 0;
    this.timer = null;

    // 设置显示信息
    await this.showInfo('flag');
    await this.showInfo('time');

    var mineArr = await this.randMine();
    await this.setSquares(mineArr);
    await this.setNumbers();
    await this.createDom();
    if (!handle) {
      await this.addEvent();
    }
    this.run();
  }

  /**
   * 重新开始游戏
   */
  Mine.prototype.restart = function () {
    this.setStatus('normal');
    this.init('restart');
  }

  /**
   * 开始游戏
   */
  Mine.prototype.run = function () {
    // 游戏开始
    // console.log('游戏开始');
    this.timer = setInterval(function () {
      this.time ++;
      if (this.time === 1000) {
        this.time = 0;
        this.timeThousands ++;
      }
      this.showInfo('time');
      // console.log(`时间已经过去了${this.timeThousands * 1000 + this.time}秒`);
    }.bind(this), 1000);
  }

  /**
   * 添加事件
   */
  Mine.prototype.addEvent = function () {
    this.el.oncontextmenu = function () { // 取消右键的菜单栏
      return false;
    }
    this.statusBtn.addEventListener('click', this.restart.bind(this), false);
    this.table.addEventListener('mousedown', this.handleMouseDown.bind(this), false);
    doc.addEventListener('mouseup', this.handleMouseUp.bind(this), false);

    this.messageBox.getElementsByClassName('close')[0].addEventListener('click', this.handleMsgClose.bind(this), false);

    this.recordBtn.addEventListener('click', this.getRecord.bind(this), false);
  }

  /**
   * 关闭消息框
   */
  Mine.prototype.handleMsgClose = function () {
    this.messageBox.style.display = 'none';
  }

  /**
   * 设置数字显示信息
   */
  Mine.prototype.showInfo = function (type) {
    var number = 0,
        dom = null;
        
    switch (type) {
      case 'time':
        // 设置时间
        number = this.time + ''; // 获取字符串形式的
        dom = this.timerBox.getElementsByClassName('number');
        break;
      case 'flag':
        // 设置flag
        number = this.flagNum + ''; // 获取字符串形式的
        dom = this.flagNumBox.getElementsByClassName('number');
        break;
      default: 
        break;
    }

    var len = number.length;
    for (var bit = 3; bit > len; bit --) { // 拼接成3位数
      number = '0' + number;
    }

    var len = number.length,
        i;

    for (i = 0; i < len; i++) {
      dom[i].className = 'number number-' + number[i];
    }
  }

  /**
   * 鼠标按下事件
   */
  Mine.prototype.handleMouseDown = function (ev) {
    var e = ev || window.event,
        tar = e.target || e.srcElement;

    preventDefaultEvent(e);
    if (this.gameStatus !== 'normal' || tar.nodeName.toLowerCase() !== 'td') {
      // 非正常游戏状态 或者 是点击到了外面的边框，不作响应
      return;
    }

    var coor = tar.getAttribute('data-coor').split(','),
    col = coor[0],
    row = coor[1],
    squ = this.squares[row][col],
    box = this.boxes[row][col];

    if (!this.theFirstClick) { // 第一次点击记录里面没有值
      this.theFirstClick = true;
      box.classList.add('focus');
    } else if (this.currentSquare.box && this.currentSquare.box === tar) {
      this.theSecondClick = true;
      this.handleLeftRightClick('down', tar);
    } else {
      this.currentSquare.box.classList.remove('focus')
    }
    
    // 做完所有判断之后再给当前点击的小方块赋值
    this.currentSquare = {...squ, box};
  }

  /**
   * 鼠标抬起事件
   */
  Mine.prototype.handleMouseUp = function (ev) {
    var e = ev || window.event,
        tar = e.target || e.srcElement;

    preventDefaultEvent(e);

    if (!this.theSecondUp) { // 非第二次抬起事件
      if (this.theFirstClick && this.theSecondClick) { // 双击了
        this.theSecondUp = true; // 标识双击，还有一次抬起事件
        // console.log('当前双击', this.currentSquare)
        this.handleLeftRightClick('up', tar);
      } else if(this.theFirstClick) {
        // console.log('当前单击')
        switch (e.which) {
          case 3:
            this.flag(this.currentSquare.box);
            break;
          case 1: 
          default:
            this.open(this.currentSquare.box);
            break;
        }
        this.currentSquare.box.classList.remove('focus');
      }
    } else {
      // console.log(11111, this.currentSquare)
      this.theSecondUp = false; // 第二次抬起事件只做一件事
      this.currentSquare.box.classList.remove('focus');
    }

    this.theFirstClick = false;
    this.theSecondClick = false;
  }

  // 左右键双击的事件
  Mine.prototype.handleLeftRightClick = function (type, target) {

    var currentSquare = this.currentSquare,
        tar = currentSquare.box || target;

    var bounding = this.getBounding(currentSquare);
    if (bounding.length > 0) {
      var boxes = this.boxes;

      // 计算周围旗子的总数
      var flag = bounding.reduce((flag, item) => {
        return flag + (this.squares[item[0]][item[1]].isFlag ? 1 : 0)
      }, 0);

      bounding.forEach(item => {
        var box = boxes[item[0]][item[1]];
        if (type === 'down') {
          box.classList.add('focus');
        } else {
          if (currentSquare.isCheck) {
            if (flag >= currentSquare.value) { // 在周围插旗数量足够了，自动展开四周
              this.open(box);
            } else {
              box.classList.remove('focus');
            }
          } else {
            box.classList.remove('focus');
          }
        }
      });
    }
  }

  /**
   * 打开
   */
  Mine.prototype.open = function (elem) {
    var coor = elem.getAttribute('data-coor').split(','),
        x = coor[0],
        y = coor[1];

    var squares = this.squares[y][x],
        box = this.boxes[y][x];
    // console.log(squares, box);
    if (box.check || box.flag) { // 递归出口在这里
      return;
    }
    if (squares.type === 'mine') { // 踩雷了 GG
      this.gameOver(box);
    } else {
      // 是数字，打开
      box.setAttribute('data-click', 'true'); // 添加上点击标识符
      this.boxes[y][x].check = true;
      this.squares[y][x].isCheck = true;

      // 检测游戏状态
      this.checkStatus('number');

      if (squares.value === 0) {
        box.className = 'number number-' + squares.value;
        var bounding = this.getBounding(squares);
        for(var i = 0; i < bounding.length; i ++) {
          var bBox = this.boxes[bounding[i][0]][bounding[i][1]];
          this.open(bBox); // 递归打开它周围的格子
        }
      } else {
        box.className = 'number number-' + squares.value;
        box.innerHTML = squares.value;
      }
    }
  }

  /**
   * 插旗
   */
  Mine.prototype.flag = function (elem) {
    var coor = elem.getAttribute('data-coor').split(','),
        x = coor[0],
        y = coor[1];

    var squares = this.squares[y][x],
        box = this.boxes[y][x];
    
    if (squares.isCheck) {
      return;
    }

    if (squares.isFlag) {
      box.className = '';
      box.flag = false;
      squares.isFlag = false;
      // 旗子剩余数量 +1
      this.flagNum ++;
    } else {
      if (this.flagNum > 0) {
        box.className = 'flag';
        box.flag = true;
        squares.isFlag = true;
        // 旗子剩余数量 -1
        this.flagNum --;
      }
    }

    this.showInfo('flag');
    if (this.flagNum === 0) {
      // 旗子已经插完，检测游戏完成状态
      this.checkStatus('flag');
    }
  }

  /**
   * 生成随机的地雷
   */
  Mine.prototype.randMine = function () {
    var level = this.level,
        num = level.row * level.col,
        arr = [];
    
    while (num) {
      arr.push(num);
      num --;
    }

    arr.sort(function (a, b) {
      return 0.5 - Math.random();
    }).sort(function (a, b) {
      return 0.5 - Math.random();
    });
    
    return arr.slice(0, level.mineNum);
  }

  /**
   * 设置格子数据
   */
  Mine.prototype.setSquares = function (mineArr) {
    var row = this.level.row,
        col = this.level.col,
        idx = 0,
        i,
        j;

    for (i = 0; i < row; i ++) {
      this.squares[i] = [];
      for (j = 0; j < col; j++) {

        idx++;

        if (mineArr.indexOf(idx) !== -1) {
          // 能在地雷数组里面找到，是地雷格子
          this.squares[i][j] = {
            x: j,
            y: i,
            type: 'mine'
          }
        } else {
          this.squares[i][j] = {
            x: j,
            y: i,
            type: 'number',
            value: 0
          }
        }
      }
    } 
  }

  /**
   * 设置地雷周围的数值
   */
  Mine.prototype.setNumbers = function () {
    var squares = this.squares,
        len = squares.length,
        i,
        item,
        j,
        box;

    for (i = 0; i < len; i ++) {
      item = squares[i];
      var itemLen = item.length;
      for (j = 0; j < itemLen; j ++) {
        box = item[j];
        if (box.type === 'mine') {
          var bounding = this.getBounding(box),
              boundLen = bounding.length,
              k,
              boundItem;

          for (k = 0; k < boundLen; k ++) {
            boundItem = bounding[k];
            if (this.squares[boundItem[0]][boundItem[1]].type === 'number') {
              this.squares[boundItem[0]][boundItem[1]].value += 1;
            }
          }

        }
      }

    }

  }

  /**
   * 获取一个坐标四周的其他位置的坐标
   * @param Object obj { x, y }
   * @return Array bounding;
   */
  Mine.prototype.getBounding = function (obj) {
    var x = obj.x,
        y = obj.y,
        bounding = [];

    if (x < 0 || x >= this.level.row || y < 0 || y >= this.level.col) {
      return false;
    }

    /**
     * x-1,y-1  x,y-1   x+1,y+1
     * x-1,     x,y     x+1,y
     * x-1,y+1  x,y+1   x+1,y+1
     */

    for (var i = x - 1; i <= x + 1; i ++) {

      for (j = y - 1; j <= y + 1; j ++) {

        if (
          i < 0 ||
          j < 0 ||
          i >= this.level.row ||
          j >= this.level.col ||
          (x === i && y === j)
        ) {
          continue;
        }

        bounding.push([j, i]);

      }

    }

    return bounding;
  }

  // 根据level等级创建出相应的小方格
  Mine.prototype.createDom = function () {
    var level = this.level,
        trNum = level.row,
        tdNum = level.row,
        boxes = [],
        i,
        j;

    var oFrag = doc.createDocumentFragment();

    for (i = 0; i < trNum; i ++) {
      var tr = doc.createElement('tr');
      boxes[i] = [];

      for (j = 0; j < tdNum; j ++) {
        var td = doc.createElement('td');
        boxes[i][j] = td;

        var squ = this.squares[i][j];

        td.setAttribute('data-coor', squ.x +','+squ.y)

        tr.appendChild(td);
      }

      oFrag.appendChild(tr);
    }
    this.boxes = boxes;

    this.table.innerHTML = ''; // 先清空内容再添加
    this.table.appendChild(oFrag);
  }

  // 展示所有的雷
  Mine.prototype.showMine = function () {
    var squares = this.squares,
        boxes = this.boxes,
        row = this.level.row,
        col = this.level.col,
        i,
        j,
        item;

    for (i = 0; i < row; i ++) {
      for (j = 0; j < col; j ++) {
        item = squares[i][j];
        var box = boxes[item.y][item.x];
        if (box.flag && item.type === 'number') {
          box.className += ' error-flag';
        }
        if (item.type === 'mine') { // 只展示雷
          box.className += ' mine';
        }
      }
    }
  }

  /**
   * 切换游戏难度
   */
  Mine.prototype.changeLevel = function (level) {
    this.lv = level;
    this.level = this.levelObj[level];
    this.restart();
  }

  /**
   * 设置游戏状态
   */
  Mine.prototype.setStatus = function (status) {
    this.gameStatus = status;
    this.statusBtn.setAttribute('data-status', status);
    this.statusBtn.className = 'status ' + status;
    clearInterval(this.timer); // 清除计时
  }

  /**
   * 检测游戏状态
   */
  Mine.prototype.checkStatus = function (type) {
    var squares = this.squares,
        row = this.level.row,
        col = this.level.col,
        status = true; // 当status被循环后还是true，则为扫雷成功，否则为扫雷失败

    var i,
        j,
        squ;

    for (i = 0; i < row; i ++) {

      for (j = 0; j < col; j++) {
        var squ = squares[i][j];
        // console.log(squ);
        if (type.toLowerCase() === 'flag') {
          if (squ.type === 'mine' && !squ.isFlag) { // 是地雷，却没有插旗
            status = false;
          }
        } else {
          if (squ.type === 'number' && !squ.isCheck) { // 是地雷，却没有插旗
            status = false;
          }
        }
      }
    }

    if (status) {
      this.win(); // 恭喜，完成游戏！
    }
    
  }

  /**
   * 扫雷成功
   */
  Mine.prototype.win = function () {
    this.setStatus('win');
    this.addRecord();
    // alert('you win!!!!~耗时：' + (this.timeThousands * 1000 + this.time) + '秒');
    
    var oDiv = doc.createElement('div');
    oDiv.className = 'win';
    oDiv.innerHTML = '成功清除所有地雷，使用时间是：' + (this.timeThousands * 1000 + this.time) + '秒！';
    this.showMessage(oDiv);
  }

  /**
   * 游戏结束GG
   */
  Mine.prototype.gameOver = function (box) {
    this.showMine();
    box.className += ' boom';

    this.setStatus('lose'); // 游戏已经结束

    // alert('恭喜你，踩雷了~');
    var oDiv = doc.createElement('div');
    oDiv.className = 'lose';
    oDiv.innerHTML = '踩到地雷了，游戏结束！';
    this.showMessage(oDiv);
  }

  Mine.prototype.showMessage = function (dom) {
    var oMsg = this.messageBox,
        content = oMsg.getElementsByClassName('content')[0];
    content.innerHTML = '';
    content.appendChild(dom);

    oMsg.style.display = 'block';
    var width = parseInt(getStyle(oMsg, 'width')),
        height = parseInt(getStyle(oMsg, 'height')),
        viewportSize = getViewportOffset();

    oMsg.style.left = (viewportSize.w - width) / 2 + 'px';
    oMsg.style.top = (viewportSize.h - height) / 2 + 'px';

  }

  /**
   * 添加游戏记录
   */
  Mine.prototype.addRecord = function () {
    var lv = this.lv,
        time = this.time,
        record = this.record;

    if (!record.hasOwnProperty(lv)) {
      record[lv] = time;
    } else {
      if (time < record[lv]) {
        record[lv] = time;
      }
    }
    try {
      this.record = record;
      localStorage.setItem('record', JSON.stringify(this.record));
    } catch(e) {}
  }

  /**
   * 获取游戏记录
   */
  Mine.prototype.getRecord = function () {
    var oDom = doc.createElement('div'),
        oUl = doc.createElement('ul'),
        oTitle = doc.createElement('div');

    oDom.className = 'record';

    oTitle.className = 'title';
    oTitle.innerHTML = '游戏记录：';

    oDom.appendChild(oTitle);
    level = {
      'primary': '初级',
      'middle': '中级',
      'high': '高级'
    }

    var record = this.record;

    for (var key in record) {
      var oLi = doc.createElement('li'),
          oLabel = doc.createElement('label'),
          oSpan = doc.createElement('span');
      
      oLabel.innerHTML = level[key] + ' -> ';
      oSpan.innerHTML = record[key] + 's';

      oLi.appendChild(oLabel);
      oLi.appendChild(oSpan);

      oUl.appendChild(oLi);
    }

    oDom.appendChild(oUl);

    this.showMessage(oDom);
  }

  /**
   * 内部方法
   */
  function getStyle (el, prop) {
    if (window.getComputedStyle) {
      return window.getComputedStyle(el, null)[prop];
    } else {
      return el.currentStyle[prop];
    }
  }

  function getViewportOffset () {
    if (window.innerWidth) {
      return {
        w: window.innerWidth,
        h: window.innerHeight
      }
    } else {
      if (doc.compatMode === 'BackCompat') {
        return {
          w: doc.body.clientWidth,
          h: doc.body.clientHeight
        }
      } else {
        return {
          w: doc.docElement.clientWidth,
          h: doc.docElement.clientHeight
        }
      }
    }
  }

  function preventDefaultEvent (e) {
    if (e.preventDefault()) {
      e.preventDefault;
    } else {
      e.returnValue = false;
    }
  }


  win.Mine = Mine;

})(window, document);