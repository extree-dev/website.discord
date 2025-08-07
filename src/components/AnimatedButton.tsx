import { useRef, useEffect } from 'react';
import './CSS/AnimateButton.css';

const CompactAnimatedButton = () => {
  const buttonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!buttonRef.current) return;

    const button = buttonRef.current;
    const images = button.querySelectorAll('.btn-img');

    const handleMouseEnter = () => {
      images.forEach((img, index) => {
        const delays = [0.1, 0.15, 0.2, 0.25];
        (img as HTMLElement).style.transition = `
          transform 0.5s ${delays[index]}s cubic-bezier(0.22, 1, 0.36, 1),
          opacity 0.4s ${delays[index]}s ease-out
        `;
        (img as HTMLElement).style.opacity = '0.8';
        
        const transforms = [
          'translate(-50px, -30px) rotate(-10deg)',
          'translate(50px, -30px) rotate(10deg)',
          'translate(-40px, 30px) rotate(5deg)',
          'translate(40px, 30px) rotate(-5deg)'
        ];
        (img as HTMLElement).style.transform = transforms[index];
      });
    };

    const handleMouseLeave = () => {
      images.forEach((img) => {
        (img as HTMLElement).style.transition = `
          transform 0.3s cubic-bezier(0.36, 0, 0.66, -0.56),
          opacity 0.2s ease-in
        `;
        (img as HTMLElement).style.transform = 'translate(0, 0) rotate(0)';
        (img as HTMLElement).style.opacity = '0';
      });
    };

    button.addEventListener('mouseenter', handleMouseEnter);
    button.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      button.removeEventListener('mouseenter', handleMouseEnter);
      button.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return (
    <div 
      ref={buttonRef} 
      className="compact-button"
    >
      <div className="btn-title">
        <span>P</span>
        <span>l</span>
        <span>a</span>
        <span>y</span>
      </div>
      
      <div className="button-hover-bg">
        <img src="https://uploads-ssl.webflow.com/62648ebcbe072375efb3062a/6264ae54c0c11b39d0df5eab_2.png" className="btn-img" alt="" />
        <img src="https://uploads-ssl.webflow.com/62648ebcbe072375efb3062a/6264ae54b1845a854a04b412_4.png" className="btn-img" alt="" />
        <img src="https://uploads-ssl.webflow.com/62648ebcbe072375efb3062a/6264ae542fe04912b9102c18_1.png" className="btn-img" alt="" />
        <img src="https://uploads-ssl.webflow.com/62648ebcbe072375efb3062a/6264ae548d38bc533959d56c_3.png" className="btn-img" alt="" />
      </div>
    </div>
  );
};

export default CompactAnimatedButton;