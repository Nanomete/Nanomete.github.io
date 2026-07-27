const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const imageData = ctx.createImageData(canvas.width, canvas.height);
const pixels = imageData.data; // Array of color [R,G,B,A, R,G,B,A, ...]
// Tools
const pencil = document.getElementById('pencil')
const eraser = document.getElementById('eraser')
const rect = document.getElementById('rect')
const rectfill = document.getElementById('rectfill')
const oval = document.getElementById('oval')
const ovaloutline = document.getElementById('ovaloutline')
const bucket = document.getElementById('bucket')
// colors
const black = document.getElementById('black')
const pink = document.getElementById('pink')
const yellow = document.getElementById('yellow')
const blue = document.getElementById('blue')
const green = document.getElementById('green')

let isDragging = false;
let prevX;
let prevY;
let endX, endY;
let r, g, b = 0; // colors
let redius = 1;
let currentTool;
let currentColor;

alert('กด ] เพื่อเพิ่มขนาดเส้น\nกด [ เพื่อเพิอลดขนาดเส้น')

// ส่วนประกอบย่อยของฟังก์ชันสำหรับการวาดรูปทรงต่าง ๆ
function putPixel(x, y, r, g, b, a = 255) {
    const index = (y * canvas.width + x) * 4;
    pixels[index] = r;
    pixels[index + 1] = g;
    pixels[index + 2] = b;
    pixels[index + 3] = a;

};

function drawLine(x0, y0, x1, y1, r, g, b, a = 255) {
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);

    if (dx > dy) {
        const m = (y1 - y0) / (x1 - x0);
        const c = y0 - m * x0;
        for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) {
            const y = Math.round(m * x + c);
            drawEllipse(x, y, redius, r, g, b, a); // Draw a filled ellipse for each pixel
        }
    } else {
        const m = (x1 - x0) / (y1 - y0);
        const c = x0 - m * y0;
        for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) {
            const x = Math.round(m * y + c);
            drawEllipse(x, y, redius, r, g, b, a); // Draw a filled ellipse for each pixel
        }
    }
}

function drawEllipse(cx, cy, r1, r, g, b, a = 255) {
    for (let y = -r1; y <= r1; y++) {
        for (let x = -r1; x <= r1; x++) {
            if ((x * x) + (y * y) <= (r1 * r1)) {
                putPixel(cx + x, cy + y, r, g, b, a);
            }
        }
    }
}

// Tool functions for drawing shapes
function drawRectangle(x0, y0, x1, y1, r, g, b, a = 255) {
    drawLine(x0, y0, x1, y0, r, g, b, a); // Top
    drawLine(x1, y0, x1, y1, r, g, b, a); // Right
    drawLine(x1, y1, x0, y1, r, g, b, a); // Bottom
    drawLine(x0, y1, x0, y0, r, g, b, a); // Left
}

function drawRectFilled(x0, y0, x1, y1, r, g, b, a = 255) {
    for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
            drawEllipse(x, y, redius, 255, 0, 0)
        }
    }
}

function drawCircle(cx, cy, rx, ry, r, g, b, a = 255) {
    for (let y = -ry; y <= ry; y++) {
        for (let x = -rx; x <= rx; x++) {
            if ((x * x) / (rx * rx) + (y * y) / (ry * ry) <= 1) {
                putPixel(cx + x, cy + y, r, g, b, a);
            }
        }
    }
}

function drawCircleOutline(cx, cy, rx, ry, r, g, b, a = 255) {
    const rx2 = rx * rx;
    const ry2 = ry * ry;

    for (let y = -ry; y <= ry; y++) {
        for (let x = -rx; x <= rx; x++) {
            const inside = (x * x) / rx2 + (y * y) / ry2 <= 1;
            const nextX = (x + 1) * (x + 1) / rx2 + (y * y) / ry2;
            const prevX = (x - 1) * (x - 1) / rx2 + (y * y) / ry2;
            const nextY = (x * x) / rx2 + (y + 1) * (y + 1) / ry2;
            const prevY = (x * x) / rx2 + (y - 1) * (y - 1) / ry2;

            const border = inside && (
                nextX > 1 || prevX > 1 || nextY > 1 || prevY > 1
            );

            if (border) {
                drawEllipse(cx + x, cy + y, redius, r, g, b, a);
            }
        }
    }
}

function drawRectFilled(x0, y0, x1, y1, r, g, b, a = 255) {
    for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
            drawEllipse(x, y, redius, r, g, b, a); // Draw a filled rectangle using ellipses
        }
    }
}


// tool select
pencil.onclick = () => {
    currentTool = 'pencil';
    console.log('เปลี่ยนเป็น: ' + currentTool);
};

eraser.onclick = () => {
    currentTool = 'eraser';
    console.log('เปลี่ยนเป็น: ' + currentTool);
};

rect.onclick = () => {
    currentTool = 'rect';
    console.log('เปลี่ยนเป็น: ' + currentTool);
}

rectfill.onclick = () => {
    currentTool = 'rectfill';
    console.log('เปลี่ยนเป็น: ' + currentTool);
}

oval.onclick = () => {
    currentTool = 'oval';
    console.log('เปลี่ยนเป็น: ' + currentTool);
}

ovaloutline.onclick = () => {
    currentTool = 'ovaloutline';
    console.log('เปลี่ยนเป็น: ' + currentTool);
}

bucket.onclick = () => {
    currentTool = 'bucket';
    console.log('เปลี่ยนเป็น: ' + currentTool);
}

// color select
black.onclick = () => {
    currentColor = 'black'
    r = 0
    g = 0
    b = 0
    console.log(currentColor)
}

pink.onclick = () => {
    currentColor = 'pink'
    r = 255;
    g = 0;
    b = 255;
    console.log(currentColor)

}

yellow.onclick = () => {
    currentColor = 'yellow'
    r = 255;
    g = 255;
    b = 0;
    console.log(currentColor)

}

blue.onclick = () => {
    currentColor = 'blue'
    r = 0;
    g = 0;
    b = 255;
    console.log(currentColor)

}

green.onclick = () => {
    currentColor = 'green'
    r = 0;
    g = 255;
    b = 0;
    console.log(currentColor)

}

red.onclick = () => {
    currentColor = 'red'
    r = 255;
    g = 0;
    b = 0;
    console.log(currentColor)

}

// condition keyboard
window.addEventListener('keydown', (event) => {
    console.log('Key down:', event.key);
    if (event.key === ']') {
        redius += 1;
        console.log(redius)
    } else if (event.key === '[') {
        redius -= 1;
        console.log(redius)
    }
});
window.addEventListener('keyup', (event) => {
    console.log('Key up:', event.key);
});


canvas.addEventListener('mousedown', (event) => {
    prevX = Math.floor(event.offsetX);
    prevY = Math.floor(event.offsetY);
    isDragging = true;

    if (currentTool === 'bucket') {
        for (let x = 0; x < canvas.width; x++) {
            for (let y = 0; y < canvas.height; y++) {
                putPixel(x,y,r,g,b)
            }
        }
    }

    console.log(prevX, prevY)
});

canvas.addEventListener('mouseup', (event) => {
    isDragging = false;
    endX = Math.floor(event.offsetX);
    endY = Math.floor(event.offsetY);

    if (currentTool === 'rect') {
        drawRectangle(prevX, prevY, endX, endY, r, g, b);
    } else if (currentTool === 'rectfill') {
        // 1. หาจุดเริ่มต้นที่น้อยกว่าเสมอ (มุมซ้ายบน)
        const x0 = Math.min(prevX, endX);
        const y0 = Math.min(prevY, endY);

        // 2. หาจุดสิ้นสุดที่มากกว่าเสมอ (มุมขวาล่าง)
        const x1 = Math.max(prevX, endX);
        const y1 = Math.max(prevY, endY);

        // 3. ส่งพิกัดที่จัดระเบียบแล้วเข้าฟังก์ชัน
        drawRectFilled(x0, y0, x1, y1, r, g, b);
    } else if (currentTool === 'oval') {
        // 1. จุดศูนย์กลางคือกึ่งกลางระหว่างจุดเริ่มกับจุดจบ
        const cx = Math.floor((prevX + endX) / 2);
        const cy = Math.floor((prevY + endY) / 2);

        // 2. รัศมีคือครึ่งหนึ่งของความกว้างและความสูง (ใช้ Math.abs กันค่าติดลบเวลาย้อนเมาส์)
        const rx = Math.floor(Math.abs(endX - prevX) / 2);
        const ry = Math.floor(Math.abs(endY - prevY) / 2);

        // 3. เรียกฟังก์ชันตามลำดับพารามิเตอร์ที่ถูกต้อง
        drawCircle(cx, cy, rx, ry, r, g, b);
    } else if (currentTool === 'ovaloutline') {
        // 1. จุดศูนย์กลางคือกึ่งกลางระหว่างจุดเริ่มกับจุดจบ
        const cx = Math.floor((prevX + endX) / 2);
        const cy = Math.floor((prevY + endY) / 2);

        // 2. รัศมีคือครึ่งหนึ่งของความกว้างและความสูง (ใช้ Math.abs กันค่าติดลบเวลาย้อนเมาส์)
        const rx = Math.floor(Math.abs(endX - prevX) / 2);
        const ry = Math.floor(Math.abs(endY - prevY) / 2);

        // 3. เรียกฟังก์ชันตามลำดับพารามิเตอร์ที่ถูกต้อง
        drawCircleOutline(cx, cy, rx, ry, r, g, b);
    }
    console.log(endX, endY)
    ctx.putImageData(imageData, 0, 0);
});

canvas.addEventListener('mousemove', (event) => {
    if (!isDragging) return;

    const x = Math.floor(event.offsetX);
    const y = Math.floor(event.offsetY);

    if (currentTool === 'pencil') {
        drawLine(prevX, prevY, x, y, r, g, b);
        drawEllipse(x, y, redius, r, g, b);
        prevX = x;
        prevY = y;
        ctx.putImageData(imageData, 0, 0);
    } else if (currentTool === 'eraser') {
        drawLine(prevX, prevY, x, y, 255, 255, 255);
        drawEllipse(x, y, redius, 255, 255, 255, 255);
        prevX = x;
        prevY = y;
        ctx.putImageData(imageData, 0, 0);
    }

});