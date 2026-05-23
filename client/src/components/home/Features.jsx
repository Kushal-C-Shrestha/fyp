import React from 'react';
import fastAccessImg from '../../assets/home/fast access.png';
import onlineConsultImg from '../../assets/home/online consultation.png';
import secureRecordsImg from '../../assets/home/secure records.png';
import easyAppointmentImg from '../../assets/home/easy appointment.png';

const features = [
  {
    text: "Find specialists fast",
    image: fastAccessImg,
  },
  {
    text: "Quick video consults",
    image: onlineConsultImg,
  },
  {
    text: "All records in one place",
    image: secureRecordsImg,
  },
  {
    text: "Book in seconds",
    image: easyAppointmentImg,
  },
];

const Features = () => {
  return (
    <section className="bg-white py-16">
      <div className="page-shell">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 sm:gap-12">
          {features.map((feature, index) => (
            <div key={index} className="flex flex-col items-center text-center">
              <div className="mb-5">
                <img 
                  src={feature.image} 
                  alt={feature.text} 
                  className="h-28 w-28 object-contain sm:h-32 sm:w-32" 
                />
              </div>
              <p className="text-sm font-semibold text-slate-900 sm:text-base lg:text-lg">{feature.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
