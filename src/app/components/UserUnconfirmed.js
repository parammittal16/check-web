import React, { Component } from 'react';
import { FormattedMessage } from 'react-intl';
import { ContentColumn } from '../styles/js/shared';

class UserUnconfirmed extends Component {
  render() {
    return (
      <ContentColumn className="card">
        <h2 className="main-title"><FormattedMessage id="userUnconfirmed.heading" defaultMessage="Error" /></h2>
        <p><FormattedMessage id="userUnconfirmed.message" defaultMessage="Your account could not be confirmed. Please contact the support." /></p>
      </ContentColumn>
    );
  }
}

export default UserUnconfirmed;
