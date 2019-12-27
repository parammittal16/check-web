import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Relay from 'react-relay/classic';
import { FormattedMessage } from 'react-intl';
import styled from 'styled-components';
import CreateRelatedMedia from './CreateRelatedMedia';
import MediaRoute from '../../relay/MediaRoute';
import mediaFragment from '../../relay/mediaFragment';
import MediaDetail from './MediaDetail';
import MediasLoading from './MediasLoading';
import CheckContext from '../../CheckContext';
import { getFilters } from '../../helpers';
import {
  FlexRow,
  black54,
  black87,
  body1,
  subheading2,
  units,
} from '../../styles/js/shared';

const StyledHeaderRow = styled.div`
  justify-content: space-between;
  display: flex;
  color: ${black54};
  font: ${body1};
  height: ${units(6)};

  h2 {
    color: ${black87};
    flex: 1;
    font: ${subheading2};
    margin: 0;
  }
`;

const previousFilters = {};

class MediaRelatedComponent extends Component {
  constructor(props) {
    super(props);

    this.state = {};
  }

  componentDidMount() {
    this.subscribe();
  }

  componentWillUpdate(nextProps) {
    if (this.props.media.dbid !== nextProps.media.dbid) {
      this.unsubscribe();
    }
  }

  componentDidUpdate(prevProps) {
    if (this.props.media.dbid !== prevProps.media.dbid) {
      this.subscribe();
    }
  }

  componentWillUnmount() {
    this.unsubscribe();
  }

  getContext() {
    return new CheckContext(this).getContextStore();
  }

  subscribe() {
    const { pusher } = this.getContext();
    if (pusher) {
      pusher.subscribe(this.props.media.pusher_channel).bind('relationship_change', 'MediaRelated', (data, run) => {
        const relationship = JSON.parse(data.message);
        if (
          (this.getContext().clientSessionId !== data.actor_session_id) &&
          (relationship.source_id === this.props.media.dbid)
        ) {
          if (run) {
            this.props.relay.forceFetch();
            return true;
          }
          return {
            id: `media-relationships-${this.props.media.dbid}`,
            callback: this.props.relay.forceFetch,
          };
        }
        return false;
      });
    }
  }

  unsubscribe() {
    const { pusher } = this.getContext();
    if (pusher) {
      pusher.unsubscribe(this.props.media.pusher_channel);
    }
  }

  render() {
    const filters = getFilters();
    const { dbid } = this.props.media;

    const medias = [];
    const { relationships } = this.props.media;
    const { targets_count, sources_count } = relationships;
    const targets = relationships.targets.edges;
    const sources = relationships.sources.edges;
    let filtered_count = 0;
    const total = targets_count + sources_count;

    if (dbid in previousFilters && filters !== previousFilters[dbid]) {
      this.props.relay.setVariables({ filters });
      this.props.relay.forceFetch();
    } else if (targets.length > 0) {
      targets[0].node.targets.edges.forEach((child) => {
        medias.push({ node: Object.assign(child.node, { target_id: targets[0].node.id }) });
      });
      filtered_count = total - medias.length;
    } else if (sources.length > 0) {
      medias.push({ node: sources[0].node.source });
      sources[0].node.siblings.edges.forEach((sibling) => {
        if (sibling.node.id !== this.props.media.id) {
          medias.push({ node: Object.assign(sibling.node, { source_id: sources[0].node.id }) });
        }
      });
    }
    previousFilters[dbid] = filters;

    return (
      <div>
        { this.props.showHeader ?
          <StyledHeaderRow>
            <FlexRow style={{ marginBottom: units(2) }}>
              <h2>
                <FormattedMessage
                  id="mediaRelated.relatedItems"
                  defaultMessage="Related items"
                />
              </h2>
            </FlexRow>
            <CreateRelatedMedia style={{ marginLeft: 'auto' }} media={this.props.media} />
          </StyledHeaderRow> : null }

        { (this.props.showNumbers && medias.length > 0) ?
          <StyledHeaderRow>
            <FlexRow>
              <FormattedMessage
                id="mediaRelated.counter"
                defaultMessage="{total, number} related items ({hidden, number} hidden by filters)"
                values={{ total, hidden: filtered_count }}
              />
            </FlexRow>
          </StyledHeaderRow> : null }

        <FlexRow>
          { (sources_count === 0 && targets_count === 0) ?
            null :
            <ul style={{ width: '100%' }}>
              {medias.map((item) => {
                if (item.node.archived) {
                  return null;
                }
                return (
                  <li key={item.node.id} className="medias__item" style={{ paddingBottom: units(1) }}>
                    {<MediaDetail
                      media={item.node}
                      condensed
                      currentRelatedMedia={this.props.media}
                      parentComponent={this}
                      parentComponentName="MediaRelated"
                      smoochBotInstalled={this.props.smoochBotInstalled}
                      hideRelated
                    />}
                    {<ul className="empty" />}
                  </li>
                );
              })}
            </ul>
          }
        </FlexRow>
      </div>
    );
  }
}

MediaRelatedComponent.contextTypes = {
  store: PropTypes.object,
};

const MediaRelatedContainer = Relay.createContainer(MediaRelatedComponent, {
  initialVariables: {
    contextId: null,
    filters: getFilters(),
  },
  fragments: {
    media: () => Relay.QL`
      fragment on ProjectMedia {
        id
        dbid
        archived
        permissions
        pusher_channel
        media {
          quote
        }
        team {
          id
          slug
        }
        project {
          dbid
          search_id
          permissions
          team {
            search_id
            verification_statuses
            translation_statuses
          }
        }
        relationships {
          id
          target_id
          source_id
          targets_count
          sources_count
          targets(first: 10000, filters: $filters) {
            edges {
              node {
                id
                type
                targets(first: 10000) {
                  edges {
                    node {
                      __typename
                      ${mediaFragment}
                    }
                  }
                }
              }
            }
          }
          sources(first: 10000) {
            edges {
              node {
                id
                type
                siblings(first: 10000) {
                  edges {
                    node {
                      ${mediaFragment}
                    }
                  }
                }
                source {
                  ${mediaFragment}
                }
              }
            }
          }
        }
      }
    `,
  },
});

const MediaRelated = (props) => {
  const ids = `${props.media.dbid},${props.media.project_id}`;
  const route = new MediaRoute({ ids });

  return (
    <Relay.RootContainer
      Component={MediaRelatedContainer}
      renderFetched={data => <MediaRelatedContainer {...props} {...data} />}
      route={route}
      renderLoading={() => <MediasLoading count={1} />}
    />
  );
};

export default MediaRelated;
