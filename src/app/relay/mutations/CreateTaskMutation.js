import Relay from 'react-relay/classic';

class CreateTaskMutation extends Relay.Mutation {
  getMutation() {
    return Relay.QL`mutation createTask {
      createTask
    }`;
  }

  getFatQuery() {
    return Relay.QL`fragment on CreateTaskPayload {
      taskEdge,
      project_media {
        log,
        tasks,
        log_count,
        last_status,
        last_status_obj
      }
    }`;
  }

  getVariables() {
    const {
      label,
      type,
      description,
      jsonoptions,
      json_schema,
      annotated_type,
      annotated_dbid,
      assigned_to_ids,
      fieldset,
    } = this.props;

    return {
      label,
      type,
      description,
      jsonoptions,
      json_schema,
      annotated_type,
      annotated_id: annotated_dbid,
      assigned_to_ids,
      fieldset,
    };
  }

  getConfigs() {
    const fieldIds = {};
    fieldIds.project_media = this.props.annotated_id;

    return [
      {
        type: 'RANGE_ADD',
        parentName: 'project_media',
        parentID: this.props.annotated_id,
        connectionName: 'item_tasks',
        edgeName: 'taskEdge',
        rangeBehaviors: () => ('prepend'),
      },
      {
        type: 'FIELDS_CHANGE',
        fieldIDs: fieldIds,
      },
    ];
  }
}

export default CreateTaskMutation;
