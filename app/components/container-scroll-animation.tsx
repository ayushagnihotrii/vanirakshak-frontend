"use client";

import React, { useRef, useState, useEffect } from "react";
import { useScroll, useTransform, motion, MotionValue } from "framer-motion";

export const ContainerScroll = ({
  titleComponent,
  children,
}: {
  titleComponent: string | React.ReactNode;
  children: React.ReactNode;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end end"],
  });
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => {
      window.removeEventListener("resize", checkMobile);
    };
  }, []);

  const scaleDimensions = () => {
    return isMobile ? [1, 1] : [1.05, 1];
  };

  const rotate = useTransform(scrollYProgress, [0, 1], isMobile ? [0, 0] : [20, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], scaleDimensions());
  const translate = useTransform(scrollYProgress, [0, 1], isMobile ? [0, 0] : [0, -60]);

  return (
    <div
      className="relative flex items-center justify-center p-1 sm:p-6 md:p-14"
      ref={containerRef}
    >
      <div
        className="w-full relative py-4 sm:py-16 md:py-24"
        style={{
          perspective: isMobile ? "none" : "1200px",
        }}
      >
        <Header translate={translate} titleComponent={titleComponent} />
        <Card rotate={rotate} translate={translate} scale={scale}>
          {children}
        </Card>
      </div>
    </div>
  );
};

export const Header = ({
  translate,
  titleComponent,
}: {
  translate: MotionValue<number>;
  titleComponent: string | React.ReactNode;
}) => {
  return (
    <motion.div
      style={{
        translateY: translate,
        willChange: "transform",
      }}
      className="max-w-6xl mx-auto text-center px-4 mb-4 sm:mb-8"
    >
      {titleComponent}
    </motion.div>
  );
};

export const Card = ({
  rotate,
  scale,
  children,
}: {
  rotate: MotionValue<number>;
  scale: MotionValue<number>;
  translate: MotionValue<number>;
  children: React.ReactNode;
}) => {
  return (
    <motion.div
      style={{
        rotateX: rotate,
        scale,
        transformStyle: "preserve-3d",
        backfaceVisibility: "hidden",
        WebkitBackfaceVisibility: "hidden",
        willChange: "transform",
        boxShadow:
          "0 0 0 1px rgba(255, 255, 255, 0.08), 0 20px 50px rgba(0, 0, 0, 0.8), 0 40px 80px -20px rgba(245, 158, 11, 0.12)",
      }}
      className="max-w-7xl mx-auto w-full border border-stone-700/80 p-1.5 sm:p-4 md:p-6 bg-[#181614] rounded-[22px] sm:rounded-[36px]"
    >
      <div className="w-full overflow-hidden rounded-[16px] sm:rounded-[26px] bg-[#121110] border border-stone-800/80">
        {children}
      </div>
    </motion.div>
  );
};
