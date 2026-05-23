import React from 'react';
import AppointmentDetailUnified from '../AppointmentDetail';

const AppointmentDetail = (props) => {
  return <AppointmentDetailUnified {...props} isDoctor={true} />;
};

export default AppointmentDetail;
