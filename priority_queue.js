
/*
 * Comparator is a function of the form:
 * function(a, b)
 * returning > 0 for a > b, 0 for a == b, and < 0 for a < b
 */
function PriorityQueue(comparator, idFn) {
    this.ar = [];
    this.map = new Map();
    this.comparator = comparator;
    this.idFn = idFn;
}

PriorityQueue.prototype = {
    isEmpty: function() {
        return this.ar.length == 0;
    },

    length: function() {
        return this.ar.length;
    },

    swap: function(a_idx, b_idx) {
        let a_tmp = this.ar[a_idx];
        let b_tmp = this.ar[b_idx];
        console.assert(this.idFn(a_tmp) in this.map, `a_tmp not in map`);
        console.assert(this.idFn(b_tmp) in this.map, `b_tmp not in map`);
        this.ar[a_idx] = b_tmp;
        this.ar[b_idx] = a_tmp;
        this.map[this.idFn(b_tmp)] = a_idx;
        this.map[this.idFn(a_tmp)] = b_idx;
    },

    bubble_up: function(idx) {
        while (idx > 0) {
            let p_idx = Math.floor((idx + 1) / 2 - 1);
            console.assert(p_idx != idx && p_idx >= 0 && p_idx < this.ar.length,
                `p_idx bad ${p_idx}`);
            if (this.comparator(this.ar[p_idx], this.ar[idx]) > 0) {
                this.swap(p_idx, idx);
                idx = p_idx;
            }
            else {
                break;
            }
        }
    },

    move_down: function(idx) {
        while (true) {
            let l_child = idx * 2 + 1;
            let r_child = idx * 2 + 2;
            if (r_child < this.ar.length) {
                let m_idx;
                if (this.comparator(this.ar[l_child], this.ar[r_child]) <= 0) {
                    m_idx = l_child;
                }
                else {
                    m_idx = r_child;
                }

                if (this.comparator(this.ar[idx], this.ar[m_idx]) > 0) {
                    this.swap(idx, m_idx);
                    idx = m_idx;
                }
                else {
                    break;
                }
            }
            else if (l_child < this.ar.length) {
                if (this.comparator(this.ar[idx], this.ar[l_child]) > 0) {
                    this.swap(idx, l_child);
                }
                break;
            }
            else {
                break;
            }
        }
    },

    push: function(obj) {
        let idx = this.ar.length;
        this.ar.push(obj);
        this.map[this.idFn(obj)] = idx;
        //console.log("list", this.ar);
        //console.log('map', this.map);
        this.bubble_up(idx);
    },

    pop: function() {
        this.swap(0, this.ar.length - 1);
        let ret = this.ar.pop();
        delete this.map[this.idFn(ret)];
        if (this.ar.length > 0) {
            this.move_down(0);
        }
        return ret;
    },

    decreaseKey: function(obj) {
        let idx = this.map[this.idFn(obj)];
        this.bubble_up(idx);
    }
};

exports.PriorityQueue = PriorityQueue;