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


    get html(){
        return `
        <div id="将棋部屋">
          <div id="後手名"></div>
          <div id="局面">
            <div id="後手駒台">
              <div id="後手駒台_歩" data-num="0" data-koma="歩_"></div>
              <div id="後手駒台_香" data-num="0" data-koma="香_"></div>
              <div id="後手駒台_桂" data-num="0" data-koma="桂_"></div>
              <div id="後手駒台_銀" data-num="0" data-koma="銀_"></div>
              <div id="後手駒台_金" data-num="0" data-koma="金_"></div>
              <div id="後手駒台_角" data-num="0" data-koma="角_"></div>
              <div id="後手駒台_飛" data-num="0" data-koma="飛_"></div>
            </div>
            <div id="将棋盤"></div>
            <div id="先手駒台">
              <div id="先手駒台_飛" data-num="0" data-koma="飛"></div>
              <div id="先手駒台_角" data-num="0" data-koma="角"></div>
              <div id="先手駒台_金" data-num="0" data-koma="金"></div>
              <div id="先手駒台_銀" data-num="0" data-koma="銀"></div>
              <div id="先手駒台_桂" data-num="0" data-koma="桂"></div>
              <div id="先手駒台_香" data-num="0" data-koma="香"></div>
              <div id="先手駒台_歩" data-num="0" data-koma="歩"></div>
            </div>
          </div>
          <div id="先手名"></div>
          <div id="コントローラー">
            <div id="最初に移動ボタン"></div>
            <div id="前に移動ボタン"></div>
            <div id="次に移動ボタン"><div id="変化選択"></div></div>
            <div id="最後に移動ボタン"></div>
            <select id="指し手選択"></select>
            <div id="ダイアログボタン"></div>
            <div id="反転ボタン"></div>
          </div>
          <div id="ダイアログ">
            <div id="ダイアログ_ヘッダ">
              <div id="ダイアログ_タイトル">将棋部屋</div>
              <div id="ダイアログ_閉じるボタン"></div>
            </div>
            <div id="ダイアログ_コンテンツ">
              <div id="ダイアログ_棋譜コピーボタン">棋譜をコピーする</div>
              <div id="ダイアログ_フッタ"><a href="https://spelunker2.wordpress.com/2018/09/20/shogitime/" target="_blank">将棋部屋 Ver1.4</a></div>
            </div>
          </div>
          <audio id="駒音" src="data:audio/mpeg;base64,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9vd81dNa7u6tzoe6YVUd/KjGuqEHEtB7js/+2tpQHV2tPC9xfH94sPF6bezUrHBe0bYNPMMKyNJJYYUIDxYaky8iBdDW5HG2AgBCVV//+5JEUAACYirEsAJDIEtFaJIBq4IH2H8LgYRUQSGVYWwTCkCryqXqvWP/X+hRKXyE4v69DZrBhR1QNDg5/Wd/QIgZBV09Wdq4liV2dEp2R063N+IgaBoO/4lBiSChABWKamqzSIQfcucArIt+hqPytlKUpjGNKVjcMBCkMbVv0AhSga+JQ1rcePciVBZ578qCoKuEt2oq6r4lOwaDRGp+o9yNTEFNRTMuOTkuNVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVTw8DeUXTEFNRTMuOTkuNVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//uSZEMP8BIAgANAAAgCwBAAcAABAAABpAAAACAAADSAAAAEVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVQ=="></audio>
        </div>
        `
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
