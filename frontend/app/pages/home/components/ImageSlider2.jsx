import { useEffect, useRef, useState } from "react";

const images = [
  "/slider/banner1.jpeg",
  "/slider/banner2.jpeg",
  "/slider/banner3.jpeg",
];

export default function ImageSlider() {
  const [index, setIndex] = useState(0);
  const startX = useRef(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % images.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleTouchStart = (e) => {
    startX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    const endX = e.changedTouches[0].clientX;
    if (startX.current - endX > 50) nextSlide();
    if (endX - startX.current > 50) prevSlide();
  };

  const nextSlide = () => {
    setIndex((prev) => (prev + 1) % images.length);
  };

  const prevSlide = () => {
    setIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <div
      style={styles.slider}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div
        style={{
          ...styles.slides,
          transform: `translateX(-${index * 100}%)`,
        }}
      >
        {images.map((img, i) => (
          <img key={i} src={img} alt="" style={styles.image} />
        ))}
      </div>

      <button style={{ ...styles.btn, left: 20 }} onClick={prevSlide}>
        ❮
      </button>
      <button style={{ ...styles.btn, right: 20 }} onClick={nextSlide}>
        ❯
      </button>
    </div>
  );
}

/* 🔥 INLINE STYLES (FULL WIDTH) */
const styles = {
  slider: {
    width: "100%",
    position: "relative",

    /* 🔥 makes it full width without scroll */
    left: "50.5%",
    right: "50%",
    marginLeft: "-50vw",
    marginRight: "-50vw",

    overflow: "hidden",
  },
  slides: {
    display: "flex",
    transition: "transform 0.5s ease-in-out",
  },
  image: {
    width: "100%",
    height: "auto",
    flexShrink: 0,
    objectFit: "cover",
    display: "block",
  },
  btn: {
    position: "absolute",
    top: "50%",
    transform: "translateY(-50%)",
    background: "rgba(0,0,0,0.6)",
    color: "#fff",
    border: "none",
    fontSize: "22px",
    padding: "10px 14px",
    cursor: "pointer",
    borderRadius: "50%",
    zIndex: 10,
  },
};
