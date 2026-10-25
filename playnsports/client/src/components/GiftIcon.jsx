import React from "react";

export default function GiftIcon({ size = 56 }) {
  // Original sample scene is 260px x 260px.
  // We scale it proportionally so it fits cleanly into the desired size (e.g. 56px).
  const scale = size / 240;

  return (
    <div
      className="gift-wrapper-outer"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: '260px',
          height: '260px',
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        <div className="gift-scene">

          {/* Back / smaller gift */}
          <div className="gift-small">
            <div className="small-box">
              <div className="small-ribbon"></div>
            </div>

            <div className="small-lid">
              <div className="small-lid-ribbon"></div>
            </div>

            {/* Small bow */}
            <div className="small-bow">
              <div className="bow-left"></div>
              <div className="bow-right"></div>
              <div className="bow-center"></div>
            </div>
          </div>

          {/* Main gift */}
          <div className="gift-main">

            {/* Main box */}
            <div className="gift-box">

              {/* Front face */}
              <div className="gift-front">
                <div className="vertical-ribbon"></div>
              </div>

              {/* Left side */}
              <div className="gift-side"></div>

              {/* Bottom shadow */}
              <div className="gift-bottom"></div>

            </div>

            {/* Lid */}
            <div className="gift-lid">
              <div className="lid-ribbon"></div>
            </div>

            {/* Main bow */}
            <div className="main-bow">
              <div className="main-bow-left"></div>
              <div className="main-bow-right"></div>
              <div className="main-bow-center"></div>
            </div>

          </div>

        </div>
      </div>

      <style>{`
        .gift-scene, .gift-scene * {
          box-sizing: border-box;
        }

        .gift-scene {
          position: relative;
          width: 260px;
          height: 260px;
          transform:
            rotate(-12deg)
            rotateX(8deg)
            rotateY(-12deg);
          filter:
            drop-shadow(0 15px 12px rgba(20,30,100,.35));
        }

        /* SMALL GIFT */
        .gift-small {
          position: absolute;
          width: 125px;
          height: 125px;
          right: 5px;
          top: 0;
          transform: rotate(12deg);
          z-index: 10;
        }

        .small-box {
          position: absolute;
          left: 12px;
          top: 35px;
          width: 100px;
          height: 78px;
          border-radius: 10px;
          background:
            linear-gradient(
              135deg,
              #6076ee,
              #273bc0 55%,
              #19268f
            );
          box-shadow:
            inset 8px 0 10px rgba(255,255,255,.12),
            inset -8px 0 12px rgba(0,0,0,.2);
        }

        .small-lid {
          position: absolute;
          left: 4px;
          top: 25px;
          width: 116px;
          height: 28px;
          border-radius: 8px;
          background:
            linear-gradient(
              180deg,
              #8298ff,
              #4057d5
            );
          box-shadow: 0 5px 5px rgba(20,30,100,.25);
        }

        .small-ribbon,
        .small-lid-ribbon {
          position: absolute;
          left: 42%;
          width: 18px;
          background:
            linear-gradient(
              90deg,
              #d7dce9,
              #f5f6fa,
              #aab1c6
            );
        }

        .small-ribbon {
          top: 0;
          bottom: 0;
        }

        .small-lid-ribbon {
          top: 0;
          bottom: 0;
        }

        /* SMALL BOW */
        .small-bow {
          position: absolute;
          top: 2px;
          left: 25px;
          width: 90px;
          height: 50px;
          z-index: 20;
        }

        .bow-left,
        .bow-right {
          position: absolute;
          width: 42px;
          height: 30px;
          border-radius: 50% 50% 45% 50%;
          background:
            linear-gradient(
              135deg,
              #8294ff,
              #393fc0
            );
          box-shadow: inset 4px 4px 5px rgba(255,255,255,.25);
        }

        .bow-left {
          left: 0;
          top: 10px;
          transform: rotate(25deg);
        }

        .bow-right {
          right: 0;
          top: 3px;
          transform: rotate(-25deg);
        }

        .bow-center {
          position: absolute;
          left: 35px;
          top: 13px;
          width: 23px;
          height: 23px;
          border-radius: 50%;
          background:
            linear-gradient(
              135deg,
              #a5b1ff,
              #4148c8
            );
          box-shadow: 0 3px 5px rgba(0,0,0,.2);
        }

        /* MAIN GIFT */
        .gift-main {
          position: absolute;
          left: 25px;
          bottom: 10px;
          width: 190px;
          height: 195px;
          transform: rotate(8deg);
          z-index: 5;
        }

        .gift-box {
          position: absolute;
          left: 0;
          bottom: 0;
          width: 180px;
          height: 145px;
          border-radius: 18px 18px 28px 28px;
          background:
            linear-gradient(
              135deg,
              #596de0 0%,
              #3448c5 45%,
              #2636a5 100%
            );
          overflow: hidden;
          box-shadow:
            inset 10px 0 15px rgba(255,255,255,.12),
            inset -12px -10px 15px rgba(0,0,0,.2),
            8px 15px 15px rgba(15,25,100,.2);
        }

        .gift-front {
          position: absolute;
          inset: 0;
        }

        .vertical-ribbon {
          position: absolute;
          top: -5px;
          bottom: -5px;
          left: 72px;
          width: 28px;
          background:
            linear-gradient(
              90deg,
              #8f96ad,
              #f1f3f7 42%,
              #c0c6d6 70%,
              #737b95
            );
          box-shadow:
            2px 0 4px rgba(0,0,0,.2),
            inset 1px 0 2px rgba(255,255,255,.5);
        }

        .gift-side {
          position: absolute;
          right: -12px;
          top: 10px;
          width: 28px;
          height: 125px;
          background:
            linear-gradient(
              90deg,
              #202f94,
              #182477
            );
          transform: skewY(-15deg);
          border-radius: 0 10px 20px 0;
        }

        .gift-bottom {
          position: absolute;
          left: 20px;
          right: 20px;
          bottom: 0;
          height: 10px;
          background: rgba(10,20,90,.35);
          border-radius: 50%;
        }

        /* MAIN LID */
        .gift-lid {
          position: absolute;
          left: -8px;
          top: 30px;
          width: 198px;
          height: 47px;
          border-radius: 14px;
          background:
            linear-gradient(
              180deg,
              #7185f1,
              #4357d5 65%,
              #293da8
            );
          box-shadow:
            0 8px 8px rgba(15,25,100,.25),
            inset 0 2px 3px rgba(255,255,255,.25);
          z-index: 10;
        }

        .lid-ribbon {
          position: absolute;
          left: 73px;
          top: -2px;
          bottom: -2px;
          width: 32px;
          background:
            linear-gradient(
              90deg,
              #8b91a7,
              #f5f6fa 45%,
              #b9bfce
            );
        }

        /* MAIN BOW */
        .main-bow {
          position: absolute;
          top: -5px;
          left: 25px;
          width: 145px;
          height: 70px;
          z-index: 20;
        }

        .main-bow-left,
        .main-bow-right {
          position: absolute;
          width: 68px;
          height: 45px;
          border-radius: 60% 45% 55% 45%;
          background:
            linear-gradient(
              135deg,
              #9aa5ff,
              #4b57d5 50%,
              #303aa5
            );
          box-shadow:
            inset 8px 5px 8px rgba(255,255,255,.22),
            2px 5px 5px rgba(20,20,100,.2);
        }

        .main-bow-left {
          left: 0;
          top: 15px;
          transform: rotate(28deg);
        }

        .main-bow-right {
          right: 0;
          top: 0;
          transform: rotate(-28deg);
        }

        .main-bow-center {
          position: absolute;
          left: 58px;
          top: 17px;
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background:
            linear-gradient(
              135deg,
              #aab5ff,
              #525fdc
            );
          box-shadow:
            inset 4px 3px 5px rgba(255,255,255,.3),
            0 4px 5px rgba(20,20,100,.25);
        }
      `}</style>
    </div>
  );
}
