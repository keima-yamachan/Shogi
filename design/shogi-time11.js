class 将棋部屋 extends HTMLElement{

    async connectedCallback(){
        benry(this, ['kif','start','reverse','myname','controller','comment','graph'])

        if(!this.kif.includes('\n')){
            this.kif = await 棋譜.ダウンロード(this.kif)
        }

        Object.assign(this, 棋譜.解析(this.kif))

        this.全局面 = 棋譜.全局面作成(this.全指し手, this.初期局面)
        this.手数   = this.手数確認(this.start, this.総手数)

        if(this.後手名.includes(this.myname)){
            this.reverse = true
        }
        if(this.comment){
            this.$コメント = document.getElementById(this.comment)
        }
        if(this.graph){
            this.$グラフ = document.getElementById(this.graph)
        }

        this.描画(true)
    }


    disconnectedCallback(){
        if(this.$グラフ){
            this.$グラフ.remove()
        }
    }


    $将棋盤_click(event){
        const {left, width} = this.$将棋盤.getBoundingClientRect()
        event.clientX < left+width/2 ? this.$前に移動ボタン.click() : this.$次に移動ボタン.click()
    }


    $最初に移動ボタン_click(event){
        this.手数 = 0
        this.変化 = 0
        this.描画(true)
    }


    $前に移動ボタン_click(event){
        if(this.$指し手選択.selectedIndex > this.総手数){
            this.$指し手選択.selectedIndex = this.$指し手選択.length - 2
        }
        else if(this.手数 > 0){
            this.go(this.手数-1)
        }
    }


    $次に移動ボタン_click(event){
        const 総手数 = this.全指し手[this.変化].length - 1

        if(this.手数 < 総手数){
            this.go(this.手数+1)
            this.駒音再生()
        }
        else{
            this.$指し手選択.selectedIndex = this.$指し手選択.length - 1
        }
    }


    $最後に移動ボタン_click(event){
        this.go(this.全指し手[this.変化].length - 1)
        this.$指し手選択.selectedIndex = this.$指し手選択.length - 1
    }


    $指し手選択_change(event){
        if(this.$指し手選択.selectedIndex > this.総手数){
            this.$最後に移動ボタン.click()
        }
        else{
            this.go(this.$指し手選択.selectedIndex)
        }
    }


    $反転ボタン_click(event){
        this.reverse = !this.reverse
        this.描画(true)
    }


    $ダイアログボタン_click(event){
        this.toggleAttribute('data-dialog')
    }


    $ダイアログ_閉じるボタン_click(event){
        this.removeAttribute('data-dialog')
    }


    $ダイアログ_棋譜コピーボタン_click(event){
        navigator.clipboard.writeText(this.kif)
    }


    $変化選択_click(event){
        event.stopPropagation()
        if(!event.target.hasAttribute('data-fork')){
            return
        }
        this.変化 = Number(event.target.dataset.fork)
        this.変化手数 = this.手数
        this.手数--

        this.$指し手選択.innerHTML = this.描画_指し手選択()
        this.$次に移動ボタン.click()
    }


    描画(全描画){
        const 手数   = this.手数
        const 局面   = this.全局面[this.変化][手数]
        const 指し手 = this.全指し手[this.変化][手数]
        const 反転   = this.reverse
        const 先手   = 反転 ? '後手' : '先手'
        const 後手   = 反転 ? '先手' : '後手'

        if(全描画){
            if(this.先手名){
                this[`$${先手}名`].textContent = `▲${this.先手名}`
            }
            if(this.後手名){
                this[`$${後手}名`].textContent = `△${this.後手名}`
            }
            if(this.controller === 'none'){
                this.$コントローラー.style.display = 'none'
            }
            if(this.$グラフ){
                this.$グラフ.描画(this.評価値, 反転)
            }

            this.toggleAttribute('data-reverse', 反転)
            this.$指し手選択.innerHTML = this.描画_指し手選択()
        }

        //将棋盤の駒
        this.$将棋盤.innerHTML = this.描画_将棋盤(局面, 反転)

        //マスハイライト
        if(this.最終手){
            this.$将棋盤.insertAdjacentHTML('beforeend', this.描画_ハイライト(this.最終手[0], this.最終手[1], 反転))
        }
        else if(手数 !== 0){
            this.$将棋盤.insertAdjacentHTML('beforeend', this.描画_ハイライト(指し手.後X, 指し手.後Y, 反転))
        }

        //持駒
        for(let 駒 in 局面.先手の持駒){
            this[`$${先手}駒台_${駒}`].dataset.num = 局面.先手の持駒[駒]
        }
        for(let 駒 in 局面.後手の持駒){
            this[`$${後手}駒台_${駒}`].dataset.num = 局面.後手の持駒[駒]
        }

        //指し手
        this.$指し手選択.selectedIndex = 手数

        //コメント
        if(this.$コメント){
            this.$コメント.textContent = 指し手.コメント
        }

        //グラフ
        if(this.$グラフ){
            this.$グラフ.更新(手数, this.評価値[手数], this.読み筋[手数])
        }

        //変化選択
        this.$変化選択.innerHTML = (!this.変化 && this.全指し手.変化手数.includes(手数)) || (this.変化 && 手数 === this.変化手数) ? this.描画_変化選択() : ''
    }


    描画_指し手選択(){
        const 全指し手 = this.全指し手[this.変化]
        let html = '<option>開始局面</option>'

        for(const v of 全指し手.slice(1)){
            html += `<option>${v.手数} ${v.手番}${v.手}</option>`
        }

        if(全指し手.勝敗 && !this.変化){
            html += `<option>${全指し手.勝敗.表記}</option>`
        }

        return html
    }


    描画_将棋盤(局面, 反転){
        let html = ''

        for(let y in 局面.駒){
            for(let x in 局面.駒[y]){
                if(局面.駒[y][x]){
                    html += this.描画_駒(局面.駒[y][x], x, y, 反転)
                }
            }
            html += `<div class="空マス">test1</div>`
        }

        return html
    }


    描画_駒(駒, x, y, 反転){
        if(反転){
            x = 10 - x
            y = 10 - y
            駒 = 駒.includes('_') ? 駒.replace('_', '') : `${駒}_`
        }

        return `<div class="空マス"><div class="駒" data-koma="${駒}" data-x="${x}" data-y="${y}">test2</div></div>`
    }


    描画_ハイライト(x, y, 反転){
        if(!x || x > 9){
            x = y = 0
        }
        if(反転){
            x = 10 - x
            y = 10 - y
        }

        return `<div class="空マス"><div id="最終手" data-x="${x}" data-y="${y}">test3</div></div>`
    }


    描画_変化選択(){
        let html = ''

        for(const [i, v] of this.全指し手.変化手数.entries()){
            if(v === this.手数){
                const x = this.全指し手[i+1][this.手数]
                html += (this.変化 && this.変化 === i+1) ? `<div data-fork="0">本線に戻る</div>` : `<div data-fork="${i+1}">${x.手番}${x.手}</div>`
            }
        }

        return html
    }


    駒音再生(){
        this.$駒音.currentTime = 0
        this.$駒音.play()
    }


    go(手数){
        this.手数 = this.手数確認(手数, this.総手数)
        this.描画()
    }


    手数確認(手数, 総手数){
        if(!手数 || !総手数){
            return 0
        }
        if(手数 < 0){
            return 総手数 + Number(手数) + 1
        }
        if(手数 > 総手数){
            return 総手数
        }
        return Number(手数)
    }     
}




class 将棋部屋グラフ extends HTMLElement{

    connectedCallback(){
        this.$本体 = document.querySelector(`shogi-time[graph="${this.id}"]`)
        benry(this, ['width','height'])
    }


    $グラフ_click(event){
        if(event.target.tagName === 'circle'){
            this.$本体.go(event.target.dataset.i)
        }
    }


    描画(評価値, 反転){
        const width  = this.width  || 800
        const height = this.height || 200

        this.$グラフ.style.width  = `${width}px`
        this.$グラフ.style.height = `${height}px`
        this.$svg.setAttribute('viewBox', `0,0,${width},${height}`)
        this.$X軸.setAttribute('x2', width)
        this.$X軸.setAttribute('y1', height)
        this.$X軸.setAttribute('y2', height)
        this.$Y軸.setAttribute('y2', height)
        this.$中心線.setAttribute('x2', width)
        this.$中心線.setAttribute('y1', height/2)
        this.$中心線.setAttribute('y2', height/2)
        this.$現在線.setAttribute('y2', height)

        if(評価値.length > 1){
            const 座標 = this.座標計算(評価値, width, height, 反転)

            this.$折れ線.setAttribute('points', this.折れ線計算(座標))
            this.$塗り潰し.setAttribute('d', this.塗り潰し計算(座標, height))
            this.$g.innerHTML = 座標.map((v, i) => `<circle cx="${v.x}" cy="${v.y}" data-i="${i}"></circle>`).join()
        }
    }


    更新(手数=0, 評価値='', 読み筋=''){
        const x = this.$g.children[手数].getAttribute('cx')

        this.$現在線.setAttribute('x1', x)
        this.$現在線.setAttribute('x2', x)
        this.$手数.textContent     = `${手数}手目`
        this.$評価値.textContent   = 評価値
        this.$読み筋.textContent   = 読み筋.replace(/ .*/, '').replace(/　/, '')
        this.$ヒント.style.display = 手数 ? 'block' : 'none'
    }


    座標計算(評価値, width, height, 反転){
        const 座標 = []
        const Ymax = 3000
        const step = width / (評価値.length-1)

        for(let [i, y] of 評価値.entries()){
            if(y > Ymax || y === '+詰'){
                y = Ymax
            }
            else if(y < -Ymax || y === '-詰'){
                y = -Ymax
            }
            if(反転){
                y = -y
            }

            座標.push({'x':i*step, 'y':height/2*(1-y/Ymax)})
        }

        return 座標
    }


    折れ線計算(座標){
        return 座標.map(v => `${v.x},${v.y}`).join(' ')
    }


    塗り潰し計算(座標, height){
        let result = ''

        for(const v of 座標){
            result += `L${v.x},${v.y}`
        }
        for(const v of 座標.concat().reverse()){
            result += `L${v.x},${height/2}`
        }
        return result.replace('L', 'M') + 'Z'
    }



    get html(){
        return `
        <div id="グラフ">
          <svg id="svg" viewBox="0,0,0,0">
            <line id="X軸"    x1="0" x2="0" y1="0" y2="0"></line>
            <line id="Y軸"    x1="0" x2="0" y1="0" y2="0"></line>
            <path id="塗り潰し" d=""></path>
            <polyline id="折れ線" points=""></polyline>
            <line id="中心線" x1="0" x2="0" y1="0" y2="0"></line>
            <line id="現在線" x1="0" x2="0" y1="0" y2="0"></line>
            <g id="g"></g>
          </svg>
          <div id="ヒント">
            <div id="手数"></div>
            <div id="評価値"></div>
            <div id="読み筋"></div>
          </div>
        </div>
        `
    }
}






class 棋譜{

    static 解析(text = ''){
        const r = this.一次解析(text)

        const 先手名   = r.先手 || r.下手 || ''
        const 後手名   = r.後手 || r.上手 || ''
        const 開始手番 = this.開始手番(r.開始手番, r.手合割)
        const 最終手   = this.最終手(r.最終手)
        const 手合割   = r.手合割
        const 評価値   = r.解析済み ? this.評価値(r.全指し手) : []
        const 読み筋   = r.解析済み ? this.読み筋(r.全指し手) : ['-']
        const 初期局面 = {
            '駒'        : this.局面図(r.局面図, 手合割),
            '先手の持駒': this.持駒(r.先手の持駒 || r.下手の持駒),
            '後手の持駒': this.持駒(r.後手の持駒 || r.上手の持駒),
        }
        const 全指し手 = this.全指し手(r.全指し手, 開始手番)
        const 総手数   = 全指し手[0].length - 1
        const 変化     = 0

        return {先手名, 後手名, 開始手番, 最終手, 手合割, 評価値, 読み筋, 初期局面, 全指し手, 総手数, 変化}
    }


    static 一次解析(text){
        const result = {局面図:[]}
        const kif    = text.trim().split(/\r?\n/)

        for(let [i, v] of kif.entries()){
            v = v.trim()

            if(v.startsWith('#')){
                continue
            }
            else if(v.startsWith('**Engines')){
                result.解析済み = true
            }
            else if(v.startsWith('|')){
                result.局面図.push(v)
            }
            else if(v.startsWith('手数＝')){
                result.最終手 = v
            }
            else if(v.includes('：')){
                const [name, value] = v.split('：')
                result[name] = value
            }
            else if(v === '先手番' || v === '下手番'){
                result.開始手番 = '先手'
            }
            else if(v === '後手番' || v === '上手番'){
                result.開始手番 = '後手'
            }
            else if(v.match(/^[1\*]/)){
                result.全指し手 = kif.slice(i)
                break
            }
        }
        return result
    }


    static async ダウンロード(url){
        const response = await fetch(url)
        if(url.match(/kif$/i)){
            const buffer = await response.arrayBuffer()
            return new TextDecoder('shift-jis').decode(buffer)
        }
        else{
            return await response.text()
        }
    }


    static 開始手番(開始手番, 手合割){
        if(開始手番){
            return 開始手番
        }
        return (手合割 && 手合割 !== '平手') ? '後手' : '先手'
    }


    static 最終手(最終手){
        if(!最終手){
            return
        }
        const 全数字   = {'１':'1', '２':'2', '３':'3', '４':'4', '５':'5', '６':'6', '７':'7', '８':'8', '９':'9'}
        const 漢数字   = {'一':'1', '二':'2', '三':'3', '四':'4', '五':'5', '六':'6', '七':'7', '八':'8', '九':'9'}
        const [, x, y] = 最終手.match(/([１２３４５６７８９])(.)/)

        return 全数字[x] + 漢数字[y]
    }


    static 局面図(局面図, 手合割){
        if(局面図.length !== 9){
            return 手合割 ? this.局面図_手合割(手合割) : this.局面図_平手()
        }

        const 局面 = this.局面図_駒無し()
        const 変換 = {'王':'玉', '竜':'龍'}

        for(let y = 0; y < 9; y++){
            let 先手 = true
            let x    = 10
 
            for(let v of 局面図[y].slice(1)){
                if(v === ' '){
                    先手 = true
                    x -= 1
                    continue
                }
                else if(v === 'v'){
                    先手 = false
                    x -= 1
                    continue
                }
                else if(v === '・'){
                    continue
                }
                else if(v === '|'){
                    break
                }

                v = 変換[v] || v
                局面[y+1][x] = 先手 ? v : `${v}_`
            }
        }
        return 局面
    }


    static 局面図_平手(){
        return {
            '1': {'9': '香_', '8': '桂_', '7': '銀_', '6': '金_', '5': '玉_', '4': '金_', '3': '銀_', '2': '桂_', '1': '香_'},
            '2': {'9': null, '8': '飛_', '7': null, '6': null, '5': null, '4': null, '3': null, '2': '角_', '1': null},
            '3': {'9': '歩_', '8': '歩_', '7': '歩_', '6': '歩_', '5': '歩_', '4': '歩_', '3': '歩_', '2': '歩_', '1': '歩_'},
            '4': {'9': null, '8': null, '7': null, '6': null, '5': null, '4': null, '3': null, '2': null, '1': null},
            '5': {'9': null, '8': null, '7': null, '6': null, '5': null, '4': null, '3': null, '2': null, '1': null},
            '6': {'9': null, '8': null, '7': null, '6': null, '5': null, '4': null, '3': null, '2': null, '1': null},
            '7': {'9': '歩', '8': '歩', '7': '歩', '6': '歩', '5': '歩', '4': '歩', '3': '歩', '2': '歩', '1': '歩'},
            '8': {'9': null, '8': '角', '7': null, '6': null, '5': null, '4': null, '3': null, '2': '飛', '1': null},
            '9': {'9': '香', '8': '桂', '7': '銀', '6': '金', '5': '玉', '4': '金', '3': '銀', '2': '桂', '1': '香'},
        }
    }


    static 局面図_駒無し() {
        return {
            '1': {'9': null, '8': null, '7': null, '6': null, '5': null, '4': null, '3': null, '2': null, '1': null},
            '2': {'9': null, '8': null, '7': null, '6': null, '5': null, '4': null, '3': null, '2': null, '1': null},
            '3': {'9': null, '8': null, '7': null, '6': null, '5': null, '4': null, '3': null, '2': null, '1': null},
            '4': {'9': null, '8': null, '7': null, '6': null, '5': null, '4': null, '3': null, '2': null, '1': null},
            '5': {'9': null, '8': null, '7': null, '6': null, '5': null, '4': null, '3': null, '2': null, '1': null},
            '6': {'9': null, '8': null, '7': null, '6': null, '5': null, '4': null, '3': null, '2': null, '1': null},
            '7': {'9': null, '8': null, '7': null, '6': null, '5': null, '4': null, '3': null, '2': null, '1': null},
            '8': {'9': null, '8': null, '7': null, '6': null, '5': null, '4': null, '3': null, '2': null, '1': null},
            '9': {'9': null, '8': null, '7': null, '6': null, '5': null, '4': null, '3': null, '2': null, '1': null},
        }
    }


    static 局面図_手合割(手合割) {
        const 局面 = this.局面図_平手()

        if(手合割 === '香落ち'){
            局面[1][1] = null
        }
        else if(手合割 === '右香落ち'){
            局面[1][9] = null
        }
        else if(手合割 === '角落ち'){
            局面[2][2] = null
        }
        else if(手合割 === '飛車落ち'){
            局面[2][8] = null
        }
        else if(手合割 === '飛香落ち'){
            局面[1][1] = null
            局面[2][8] = null
        }
        else if(手合割 === '二枚落ち'){
            局面[2][2] = null
            局面[2][8] = null
        }
        else if(手合割 === '三枚落ち'){
            局面[1][1] = null
            局面[2][2] = null
            局面[2][8] = null
        }
        else if(手合割 === '四枚落ち'){
            局面[1][1] = null
            局面[1][9] = null
            局面[2][2] = null
            局面[2][8] = null
        }
        else if(手合割 === '五枚落ち'){
            局面[1][1] = null
            局面[1][2] = null
            局面[1][9] = null
            局面[2][2] = null
            局面[2][8] = null
        }
        else if(手合割 === '左五枚落ち'){
            局面[1][1] = null
            局面[1][8] = null
            局面[1][9] = null
            局面[2][2] = null
            局面[2][8] = null
        }
        else if(手合割 === '六枚落ち'){
            局面[1][1] = null
            局面[1][2] = null
            局面[1][8] = null
            局面[1][9] = null
            局面[2][2] = null
            局面[2][8] = null
        }
        else if(手合割 === '八枚落ち'){
            局面[1][1] = null
            局面[1][2] = null
            局面[1][3] = null
            局面[1][7] = null
            局面[1][8] = null
            局面[1][9] = null
            局面[2][2] = null
            局面[2][8] = null
        }
        else if(手合割 === '十枚落ち'){
            局面[1][1] = null
            局面[1][2] = null
            局面[1][3] = null
            局面[1][4] = null
            局面[1][6] = null
            局面[1][7] = null
            局面[1][8] = null
            局面[1][9] = null
            局面[2][2] = null
            局面[2][8] = null
        }
        return 局面
    }


    static 持駒(持駒){
        const 初期持駒 = {'歩': 0, '香': 0, '桂': 0, '銀': 0, '金': 0, '飛': 0, '角': 0}
        const 漢数字   = {'一':1, '二':2, '三':3, '四':4, '五':5, '六':6, '七':7, '八':8, '九':9, '十':10, '十一':11, '十二':12, '十三':13, '十四':14, '十五':15, '十六':16, '十七':17, '十八':18}

        if(!持駒 || 持駒.includes('なし')){
            return 初期持駒
        }

        for(const v of 持駒.split(/\s/)){
            const [, 駒, 数] = v.match(/(.)(.*)/)
            初期持駒[駒] = 漢数字[数] || 1

        }
        return 初期持駒
    }


    static 全指し手(kif, 開始手番){
        const result    = [[{手数:0, コメント:''}]]
        result.変化手数 = []
        let 変化 = 0
        let 手数 = 0

        if(!kif){
            return result
        }

        for(let v of kif){
            v = v.trim()

            if(v.startsWith('*') && result[変化][手数]){ //指し手コメント
                result[変化][手数].コメント += v.replace(/^\*/, '') + '\n'
            }
            else if(v.match(/^\d/)){
                手数++
                this.全指し手_現在の手(result[変化], v, 手数, 開始手番)
            }
            else if(v.includes('変化：')){
                手数 = Number(v.match(/変化：(\d+)/)[1])
                result.push(result[0].slice(0, 手数))
                result.変化手数.push(手数)
                手数--
                変化++
            }
        }
        return result
    }


    static 全指し手_現在の手(全指し手, kif, 手数, 開始手番){
        const 全数字   = {'１':1, '２':2, '３':3, '４':4, '５':5, '６':6, '７':7, '８':8, '９':9}
        const 漢数字   = {'一':1, '二':2, '三':3, '四':4, '五':5, '六':6, '七':7, '八':8, '九':9}
        const 終局表記 = ['中断', '投了', '持将棋', '千日手', '詰み', '切れ負け', '反則勝ち', '反則負け', '入玉勝ち']

        const 手番     = this.全指し手_現在の手_手番(手数, 開始手番)
        const 現在の手 = kif.split(/ +/)[1] || ''
        const 解析     = 現在の手.match(/([１-９同])([一二三四五六七八九　])([^\(]+)(\((\d)(\d)\))?/)

        if(解析){
            全指し手.push({
                '手数': 手数,
                '手番': 手番,
                '手'  : 解析[0],
                '駒'  : 解析[3].replace(/[打成]$/, '').replace('成銀', '全').replace('成桂', '圭').replace('成香', '杏').replace('王', '玉').replace('竜', '龍'),
                '前X' : Number(解析[5] || 0),
                '前Y' : Number(解析[6] || 0),
                '後X' : (解析[1] === '同') ? 全指し手[手数-1].後X : 全数字[解析[1]],
                '後Y' : (解析[1] === '同') ? 全指し手[手数-1].後Y : 漢数字[解析[2]],
                '成り': 解析[3].endsWith('成'),
                'コメント': '',
            })
        }
        else if(現在の手 === 'パス'){
            全指し手.push({'手数':手数, '手番':手番, '手':'パス', '駒':'', '前X':0, '前Y':0, '後X':0, '後Y':0, '成り':false, 'コメント':''})
        }
        else if(終局表記.includes(現在の手)){
            全指し手.勝敗 = this.全指し手_勝敗(現在の手, 手番)
        }
    }


    static 全指し手_現在の手_手番(手数, 開始手番){
        if(開始手番 === '先手'){
            return 手数 % 2 ? '▲' : '△'
        }
        else{
            return 手数 % 2 ? '△' : '▲'
        }
    }


    static 全指し手_勝敗(理由, 手番){
        const result = {'勝者':'', '敗者':'', '理由':理由, '表記':''}

        if(理由 === '投了' || 理由 === '詰み' || 理由 === '切れ負け' || 理由 === '反則負け'){
            result.勝者 = (手番 === '▲') ? '△' : '▲'
            result.敗者 = (手番 === '▲') ? '▲' : '△'
            result.表記 = `${result.敗者}${理由}で${result.勝者}の勝ち`
        }
        else if(理由 === '反則勝ち' || 理由 === '入玉勝ち'){
            result.勝者 = (手番 === '▲') ? '▲' : '△'
            result.敗者 = (手番 === '▲') ? '△' : '▲'
            result.表記 = result.勝者 + 理由
        }
        else if(理由 === '持将棋' || 理由 === '千日手'){
            result.勝者 = result.敗者 = '引き分け'
            result.表記 = 理由 + 'で引き分け'
        }
        else if(理由 === '中断'){
            result.表記 = 理由
        }
        return result
    }


    static 評価値(kif){
        const 評価値 = []

        for(const v of kif){
            if(v.startsWith('**解析 0')){
                評価値.push(v.match(/評価値 ([\+\-\d詰]+)/)[1] || '')
            }
        }
        return 評価値
    }


    static 読み筋(kif){
        const 全読み筋 = ['-']

        for(const v of kif){
            if(v.startsWith('**解析 0')){
                全読み筋.push(v.match(/読み筋 (.*)/)[1] || '')
            }
        }
        return 全読み筋
    }


    static 全局面作成(全指し手, 初期局面){
        const result = []

        for(const i of 全指し手.keys()){
            result[i] = [初期局面]
            for(let j = 1; j < 全指し手[i].length; j++){
                result[i].push(this.各局面作成(全指し手[i][j], result[i][j-1]))
            }
        }

        return result
    }


    static 各局面作成(指し手, 前局面){ // 指し手 = {'手数','手番','手','駒','前X','前Y','後X','後Y','成り'}
        const 局面 = JSON.parse(JSON.stringify(前局面))
        const 手番 = (指し手.手番 === '▲') ? '先手' : '後手'
        let   駒   = 指し手.駒

        const 成変換 = {'歩':'と', '香':'杏', '桂':'圭', '銀':'全', '角':'馬', '飛':'龍'}
        const 逆変換 = {'と':'歩', '杏':'香', '圭':'桂', '全':'銀', '馬':'角', '龍':'飛'}

        if(指し手.手 === 'パス'){
            return 局面
        }

        if(指し手.前X === 0){ //駒を打つ場合
            局面[`${手番}の持駒`][駒]--
        }
        else{ //駒を移動する場合
            局面.駒[指し手.前Y][指し手.前X] = null

            if(指し手.成り){ //駒が成る場合
                駒 = 成変換[駒] || 駒
            }

            if(局面.駒[指し手.後Y][指し手.後X]){ //駒を取る場合
                let 取得駒 = 局面.駒[指し手.後Y][指し手.後X].replace('_', '')
                取得駒 = 逆変換[取得駒] || 取得駒
                局面[`${手番}の持駒`][取得駒]++
            }
        }

        局面.駒[指し手.後Y][指し手.後X] = (手番 === '先手') ? 駒 : `${駒}_`

        return 局面
    }
}





function benry(self, attr = []){ // https://qiita.com/economist/items/6c923c255f6b4b7bbf84
    self.$ = self.attachShadow({mode:'open'})
    self.$.innerHTML = self.html || ''

    for(const el of self.$.querySelectorAll('[id]')){
        self[`$${el.id}`] = el
    }

    for(const name of Object.getOwnPropertyNames(self.constructor.prototype)){
        if(typeof self[name] !== 'function'){
            continue
        }
        self[name]  = self[name].bind(self)
        const match = name.match(/^(\$.*?)_([^_]+)$/)
        if(match && self[match[1]]){
            self[match[1]].addEventListener(match[2], self[name])
        }
    }

    for(const name of attr){
        self[name] = self.getAttribute(name)
    }
}


customElements.define('shogi-time-graph', 将棋部屋グラフ)
customElements.define('shogi-time', 将棋部屋)
