import { useRef, useEffect } from "react";

const SpiderMan = ({ photos, domRef, onClickSlot }) => {
  const spiderRef = useRef(null);

  useEffect(() => {
    const styleId = "spider-man-print-styles";
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = `
        @import url('https://fonts.googleapis.com/css2?family=Permanent+Marker&family=Bangers&display=swap');
        
        .brush-stroke-frame {
          position: relative;
          background-color: white;
          border: 8px solid #DC2626;
          border-radius: 40% 10% 30% 20% / 10% 40% 20% 30%;
          transform: rotate(-2deg);
          overflow: hidden;
          box-shadow: 
            0 0 0 4px #FCA5A5,
            0 0 0 8px #EF4444,
            0 0 0 12px #DC2626,
            0 6px 12px rgba(185, 28, 28, 0.4),
            inset 0 0 15px rgba(239, 68, 68, 0.1);
        }
        
        .brush-stroke-frame::before {
          content: '';
          position: absolute;
          top: -12px; bottom: -12px; left: -12px; right: -12px;
          border: 12px solid #FCA5A5;
          border-radius: 40% 10% 30% 20% / 10% 40% 20% 30%;
          transform: rotate(2deg);
          z-index: -1;
          opacity: 0.6;
        }
        
        .brush-stroke-frame::after {
          content: '';
          position: absolute;
          top: -6px; bottom: -6px; left: -6px; right: -6px;
          border: 10px solid #F87171;
          border-radius: 40% 10% 30% 20% / 10% 40% 20% 30%;
          transform: rotate(-1deg);
          z-index: -1;
          opacity: 0.7;
        }
        
        .font-spiderman-name {
          font-family: 'Permanent Marker', cursive;
        }
        
        .font-spiderman-title {
          font-family: 'Bangers', cursive;
        }
        
        .placeholder-background {
          background: linear-gradient(to bottom, #ADD8E6 60%, #90EE90 40%);
          height: 100%;
          width: 100%;
          position: absolute;
          top: 0;
          left: 0;
        }
        
        @media print {
          .bg-gradient-to-br,
          .bg-gradient-to-r,
          .bg-gradient-to-t,
          .bg-gradient-to-b {
            print-color-adjust: exact !important;
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  return (
    <div className="flex flex-col items-center gap-6 relative overflow-hidden">
      <div
        ref={domRef || spiderRef}
        className="relative"
        style={{
          width: "320px",
          height: "90vh",
          maxHeight: "1000px",
        }}
      >
        <div className="w-full h-full bg-red-700 shadow-2xl relative overflow-hidden p-6 rounded-xl">
          {/* Top right badge */}
          <div className="absolute top-4 right-4 bg-red-400 border-2 border-white transform -skew-x-6 p-1.5 shadow-lg z-20">
            <span className="block text-xs font-sans text-white uppercase tracking-wider font-bold">
              HELLO
            </span>
            <span className="block text-xl font-spiderman-name text-white leading-none">
              Peter Parker
            </span>
          </div>

          {/* Top left Spider-Man */}
          <img
            src="https://www.pngall.com/wp-content/uploads/17/Chibi-Spider-Man-Dynamic-Expression-PNG.png"
            alt="Chibi Spider-Man Hanging"
            className="absolute top-0 left-0 transform -translate-x-1 translate-y-2 rotate-12 w-20 h-20 object-contain z-30"
          />

          <div className="space-y-6 mt-24">
            {/* Photo 1 */}
            <div className="h-48 relative z-10 brush-stroke-frame">
              <div className="placeholder-background"></div>
              <div
                className="relative z-10 cursor-pointer"
                onClick={() => onClickSlot && onClickSlot(0)}
              >
                {photos[0] ? (
                  <img
                    src={photos[0]}
                    alt="Photo 1"
                    className="w-full h-full object-cover rounded scale-110"
                  />
                ) : (
                  <div className="text-center">
                    <p className="text-gray-700 font-bold text-lg">
                      Gambar Anda di Sini 1
                    </p>
                    <p className="text-gray-500 text-sm">(Pemandangan)</p>
                  </div>
                )}
              </div>
              <img
                src="https://www.pngall.com/wp-content/uploads/17/Chibi-Spider-Man-Dynamic-Pose-PNG.png"
                alt="Chibi Spider-Man Peeking"
                className="absolute bottom-[-10px] right-2 transform translate-y-1/2 w-16 h-16 object-contain z-20"
              />
            </div>

            {/* Photo 2 */}
            <div className="h-48 relative z-10 brush-stroke-frame">
              <div className="placeholder-background"></div>
              <div
                className="relative z-10 cursor-pointer"
                onClick={() => onClickSlot && onClickSlot(1)}
              >
                {photos[1] ? (
                  <img
                    src={photos[1]}
                    alt="Photo 2"
                    className="w-full h-full object-cover rounded scale-110"
                  />
                ) : (
                  <div className="text-center">
                    <p className="text-gray-700 font-bold text-lg">
                      Gambar Anda di Sini 2
                    </p>
                    <p className="text-gray-500 text-sm">(Aksi)</p>
                  </div>
                )}
              </div>
              <div className="absolute top-2 left-[-10px] w-12 h-16 bg-yellow-400 border-2 border-red-900 transform -rotate-8 shadow-md flex justify-center items-center z-20">
                <img
                  src="https://pngimg.com/d/spider_man_PNG76.png"
                  alt="Comic Panel"
                  className="w-10 h-14 object-cover"
                />
              </div>
              <div className="absolute bottom-2 left-4 bg-white border-2 border-black rounded-full px-3 py-1 text-xs font-bold transform -skew-x-12 z-20">
                DUDE.
              </div>
            </div>

            {/* Photo 3 */}
            <div className="h-48 relative z-10 brush-stroke-frame">
              <div className="placeholder-background"></div>
              <div
                className="relative z-10 cursor-pointer"
                onClick={() => onClickSlot && onClickSlot(2)}
              >
                {photos[2] ? (
                  <img
                    src={photos[2]}
                    alt="Photo 3"
                    className="w-full h-full object-cover rounded scale-110"
                  />
                ) : (
                  <div className="text-center">
                    <p className="text-gray-700 font-bold text-lg">
                      Gambar Anda di Sini 3
                    </p>
                    <p className="text-gray-500 text-sm">(Wajah)</p>
                  </div>
                )}
              </div>
              <img
                src="https://www.pikpng.com/pngl/b/150-1504109_chibi-spiderman-png-spider-man-em-chibi-clipart.png"
                alt="Chibi Mask"
                className="absolute bottom-2 left-2 w-12 h-12 object-contain z-20"
              />
              <div className="absolute top-4 right-4 text-3xl text-red-900 transform rotate-12 font-extrabold z-20">
                !!!
              </div>
              <img
                src="https://www.pngall.com/wp-content/uploads/17/Chibi-Spider-Man-Character-Pose-PNG.png"
                alt="Chibi Spider-Man Standing"
                className="absolute bottom-0 right-2 w-16 h-16 object-contain z-20"
              />
            </div>
          </div>

          {/* Bottom text */}
          <div className="absolute bottom-4 left-0 right-0 text-center z-20">
            <p className="text-white text-sm font-semibold mb-1 tracking-widest">
              MARVEL
            </p>
            <h1 className="text-white text-5xl font-spiderman-title tracking-widest leading-none">
              SPIDER-MAN
            </h1>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SpiderMan;
